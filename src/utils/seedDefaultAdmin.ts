import bcrypt from "bcrypt";
import type { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { loadEnv } from "../config/env";
import { User, UserRole, UserStatus } from "../entities/User";
import { Wallet } from "../entities/Wallet";
import { MerchantCategory } from "../entities/MerchantCategory";
import { CategoryWalletService } from "../services/categoryWalletService";

async function generateReferenceId(userRepo: Repository<User>): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let tries = 0; tries < 8; tries += 1) {
    let ref = "SU";
    for (let i = 0; i < 8; i += 1) {
      ref += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const exists = await userRepo.findOne({ where: { referenceId: ref }, select: ["id"] });
    if (!exists) return ref;
  }
  throw new Error("Could not generate unique reference id for seeded admin");
}

async function generateReferenceIdWithPrefix(userRepo: Repository<User>, prefix: string): Promise<string> {
  const normalizedPrefix = prefix.trim().toUpperCase().slice(0, 2);
  if (normalizedPrefix.length !== 2) {
    throw new Error("Reference prefix must contain 2 letters");
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let tries = 0; tries < 8; tries += 1) {
    let ref = normalizedPrefix;
    for (let i = 0; i < 8; i += 1) {
      ref += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const exists = await userRepo.findOne({ where: { referenceId: ref }, select: ["id"] });
    if (!exists) return ref;
  }
  throw new Error(`Could not generate unique reference id for prefix ${normalizedPrefix}`);
}

export async function seedDefaultAdmin(): Promise<void> {
  const env = loadEnv();
  if (!env.SEED_DEFAULT_ADMIN || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    return;
  }

  const userRepo = AppDataSource.getRepository(User);
  const walletRepo = AppDataSource.getRepository(Wallet);
  const merchantCategoryRepo = AppDataSource.getRepository(MerchantCategory);
  const categoryWalletService = new CategoryWalletService();
  const defaultMerchantCategories = [
    { code: "AL", displayName: "All Categories" },
    { code: "FO", displayName: "Food" },
    { code: "TR", displayName: "Transportation" },
    { code: "PC", displayName: "Personal Care" },
    { code: "HO", displayName: "Household" },
  ];

  for (const category of defaultMerchantCategories) {
    const existingCategory = await merchantCategoryRepo.findOne({ where: { code: category.code } });
    if (!existingCategory) {
      await merchantCategoryRepo.save(
        merchantCategoryRepo.create({
          code: category.code,
          displayName: category.displayName,
          isActive: true,
        })
      );
      continue;
    }
    existingCategory.displayName = category.displayName;
    existingCategory.isActive = true;
    await merchantCategoryRepo.save(existingCategory);
  }

  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    const existingWallet = await walletRepo.findOne({ where: { user: { id: existing.id } }, relations: ["user"] });
    if (!existingWallet) {
      // Admin must stay management-only: no wallet is created.
    } else {
      await walletRepo.delete(existingWallet.id);
    }
  } else {
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    await userRepo.save(
      userRepo.create({
        email,
        referenceId: await generateReferenceId(userRepo),
        passwordHash,
        fullName: "Administrator",
        phone: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        merchantCategory: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      })
    );
    console.info(`Seeded admin user: ${email}`);
  }

  // Seed 5 ready-to-use test users:
  // user1..user5 with shared password 12345678
  const sharedTestPassword = "12345678";
  const sharedTestPasswordHash = await bcrypt.hash(sharedTestPassword, 10);
  for (let i = 1; i <= 5; i += 1) {
    const testEmail = `user${i}@amanpay.test`;
    const existingTestUser = await userRepo.findOne({ where: { email: testEmail } });
    const testPhone = `${i}000000${i}`; // 8-digit phone pattern: 1.... through 5....
    const testUser = await userRepo.save(
      existingTestUser
        ? {
            ...existingTestUser,
            fullName: `Test User ${i}`,
            phone: testPhone,
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            merchantCategory: null,
            passwordHash: sharedTestPasswordHash,
          }
        : userRepo.create({
            email: testEmail,
            referenceId: await generateReferenceId(userRepo),
            passwordHash: sharedTestPasswordHash,
            fullName: `Test User ${i}`,
            phone: testPhone,
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            merchantCategory: null,
            passwordResetTokenHash: null,
            passwordResetExpiresAt: null,
          })
    );

    const existingWallet = await walletRepo.findOne({ where: { user: { id: testUser.id } }, relations: ["user"] });
    if (!existingWallet) {
      const randomIntBalance = Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000;
      await walletRepo.save(
        walletRepo.create({
          user: testUser,
          totalBalance: String(randomIntBalance),
          currency: "EUR",
        })
      );
    }
    await categoryWalletService.ensureForUser(testUser.id);
  }

  // Seed 2 merchants in two different categories.
  const merchantSeeds = [
    {
      email: "all.shop@amanpay.test",
      fullName: "All Categories Merchant",
      phone: "27808009",
      merchantCategory: "AL",
    },
    {
      email: "food.shop@amanpay.test",
      fullName: "Food Merchant",
      phone: "27808007",
      merchantCategory: "FO",
    },
    {
      email: "transport.hub@amanpay.test",
      fullName: "Transportation Merchant",
      phone: "27808008",
      merchantCategory: "TR",
    },
  ];

  for (const merchantSeed of merchantSeeds) {
    const existingMerchant = await userRepo.findOne({ where: { email: merchantSeed.email } });
    const merchant = await userRepo.save(
      existingMerchant
        ? {
            ...existingMerchant,
            fullName: merchantSeed.fullName,
            phone: merchantSeed.phone,
            role: UserRole.MERCHANT,
            status: UserStatus.ACTIVE,
            merchantCategory: merchantSeed.merchantCategory,
            passwordHash: sharedTestPasswordHash,
          }
        : userRepo.create({
            email: merchantSeed.email,
            referenceId: await generateReferenceIdWithPrefix(userRepo, merchantSeed.merchantCategory),
            passwordHash: sharedTestPasswordHash,
            fullName: merchantSeed.fullName,
            phone: merchantSeed.phone,
            role: UserRole.MERCHANT,
            status: UserStatus.ACTIVE,
            merchantCategory: merchantSeed.merchantCategory,
            passwordResetTokenHash: null,
            passwordResetExpiresAt: null,
          })
    );

    const merchantWallet = await walletRepo.findOne({
      where: { user: { id: merchant.id } },
      relations: ["user"],
    });
    if (!merchantWallet) {
      await walletRepo.save(
        walletRepo.create({
          user: merchant,
          totalBalance: "0",
          currency: "EUR",
        })
      );
    }
  }
}

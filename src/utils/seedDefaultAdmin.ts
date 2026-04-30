import bcrypt from "bcrypt";
import type { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { loadEnv } from "../config/env";
import { User, UserRole } from "../entities/User";
import { Wallet } from "../entities/Wallet";

async function generateReferenceId(userRepo: Repository<User>): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let tries = 0; tries < 8; tries += 1) {
    let ref = "";
    for (let i = 0; i < 10; i += 1) {
      ref += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const exists = await userRepo.findOne({ where: { referenceId: ref }, select: ["id"] });
    if (!exists) return ref;
  }
  throw new Error("Could not generate unique reference id for seeded admin");
}

export async function seedDefaultAdmin(): Promise<void> {
  const env = loadEnv();
  if (!env.SEED_DEFAULT_ADMIN || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    return;
  }

  const userRepo = AppDataSource.getRepository(User);
  const walletRepo = AppDataSource.getRepository(Wallet);
  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    const existingWallet = await walletRepo.findOne({ where: { user: { id: existing.id } }, relations: ["user"] });
    if (!existingWallet) {
      await walletRepo.save(
        walletRepo.create({
          user: existing,
          totalBalance: "5000",
          currency: "EUR",
        })
      );
    }
  } else {
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    const admin = await userRepo.save(
      userRepo.create({
        email,
        referenceId: await generateReferenceId(userRepo),
        passwordHash,
        fullName: "Administrator",
        phone: null,
        role: UserRole.ADMIN,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      })
    );
    await walletRepo.save(
      walletRepo.create({
        user: admin,
        totalBalance: "5000",
        currency: "EUR",
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
            passwordHash: sharedTestPasswordHash,
          }
        : userRepo.create({
            email: testEmail,
            referenceId: await generateReferenceId(userRepo),
            passwordHash: sharedTestPasswordHash,
            fullName: `Test User ${i}`,
            phone: testPhone,
            role: UserRole.USER,
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
  }
}

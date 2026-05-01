import bcrypt from "bcrypt";
import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { User, UserRole, UserStatus } from "../entities/User";
import { MerchantCategory } from "../entities/MerchantCategory";
import { CategoryWalletService } from "./categoryWalletService";

/** Admin users resource exposes internal numeric `id` (not auth public UUID). */
const adminUserSelect = [
  "id",
  "email",
  "fullName",
  "phone",
  "role",
  "status",
  "merchantCategory",
  "createdAt",
  "updatedAt",
] as const;

export type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  role?: UserRole;
  status?: UserStatus;
  merchantCategory?: string | null;
};

export type UpdateUserInput = {
  email?: string;
  fullName?: string;
  phone?: string | null;
  role?: UserRole;
  status?: UserStatus;
  merchantCategory?: string | null;
  password?: string;
};

export class UsersService {
  private repo = AppDataSource.getRepository(User);
  private merchantCategoryRepo = AppDataSource.getRepository(MerchantCategory);
  private categoryWalletService = new CategoryWalletService();
  private async generateReferenceId(role: UserRole, merchantCategory?: string | null): Promise<string> {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const prefix =
      role === UserRole.MERCHANT
        ? (merchantCategory ?? "").trim().toUpperCase().slice(0, 2)
        : role === UserRole.USER
          ? "SU"
          : "AD";
    if (prefix.length !== 2) {
      throw new AppError(400, "Merchant category is required", "validation_error");
    }
    for (let tries = 0; tries < 8; tries += 1) {
      let ref = prefix;
      for (let i = 0; i < 8; i += 1) {
        ref += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      const exists = await this.repo.findOne({ where: { referenceId: ref }, select: ["id"] });
      if (!exists) return ref;
    }
    throw new AppError(500, "Could not generate unique reference id", "reference_generation_failed");
  }

  async findAll(): Promise<Pick<User, (typeof adminUserSelect)[number]>[]> {
    return this.repo.find({ select: [...adminUserSelect] });
  }

  async findById(id: number): Promise<Pick<User, (typeof adminUserSelect)[number]> | null> {
    return this.repo.findOne({ where: { id }, select: [...adminUserSelect] });
  }

  async create(input: CreateUserInput): Promise<Pick<User, (typeof adminUserSelect)[number]>> {
    const normalized = input.email.trim().toLowerCase();
    const existing = await this.repo.findOne({ where: { email: normalized } });
    if (existing) {
      throw new AppError(409, "Email already registered", "email_taken");
    }
    const role = input.role ?? UserRole.USER;
    const merchantCategory =
      role === UserRole.MERCHANT ? (input.merchantCategory ?? "").trim().toUpperCase() : null;
    if (role === UserRole.MERCHANT && (!merchantCategory || merchantCategory.length < 2)) {
      throw new AppError(400, "merchantCategory is required for merchant users", "validation_error");
    }
    if (role === UserRole.MERCHANT && merchantCategory) {
      const categoryExists = await this.merchantCategoryRepo.findOne({
        where: { code: merchantCategory, isActive: true },
        select: ["id"],
      });
      if (!categoryExists) {
        throw new AppError(400, "Invalid merchant category", "validation_error");
      }
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = this.repo.create({
      email: normalized,
      referenceId: await this.generateReferenceId(role, merchantCategory),
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone ?? null,
      role,
      status: input.status ?? UserStatus.ACTIVE,
      merchantCategory,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
    const saved = await this.repo.save(user);
    if (saved.role === UserRole.USER) {
      await this.categoryWalletService.ensureForUser(saved.id);
    }
    const safe = await this.repo.findOne({
      where: { id: saved.id },
      select: [...adminUserSelect],
    });
    if (!safe) {
      throw new AppError(500, "User persist failed", "persist_failed");
    }
    return safe;
  }

  async update(id: number, input: UpdateUserInput): Promise<Pick<User, (typeof adminUserSelect)[number]>> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) {
      throw new AppError(404, "User not found", "not_found");
    }
    if (input.email !== undefined) {
      const normalized = input.email.trim().toLowerCase();
      const taken = await this.repo.findOne({ where: { email: normalized } });
      if (taken && taken.id !== id) {
        throw new AppError(409, "Email already in use", "email_taken");
      }
      existing.email = normalized;
    }
    if (input.fullName !== undefined) {
      existing.fullName = input.fullName.trim();
    }
    if (input.phone !== undefined) {
      existing.phone = input.phone;
    }
    if (input.role !== undefined) {
      existing.role = input.role;
    }
    if (input.status !== undefined) {
      existing.status = input.status;
    }
    if (input.merchantCategory !== undefined) {
      existing.merchantCategory = input.merchantCategory ? input.merchantCategory.trim().toUpperCase() : null;
    }
    if (existing.role === UserRole.MERCHANT && (!existing.merchantCategory || existing.merchantCategory.length < 2)) {
      throw new AppError(400, "merchantCategory is required for merchant users", "validation_error");
    }
    if (existing.role === UserRole.MERCHANT && existing.merchantCategory) {
      const categoryExists = await this.merchantCategoryRepo.findOne({
        where: { code: existing.merchantCategory, isActive: true },
        select: ["id"],
      });
      if (!categoryExists) {
        throw new AppError(400, "Invalid merchant category", "validation_error");
      }
    }
    if (existing.role !== UserRole.MERCHANT) {
      existing.merchantCategory = null;
    }
    if (input.password !== undefined) {
      existing.passwordHash = await bcrypt.hash(input.password, 10);
    }
    await this.repo.save(existing);
    const safe = await this.repo.findOne({ where: { id }, select: [...adminUserSelect] });
    if (!safe) {
      throw new AppError(500, "User persist failed", "persist_failed");
    }
    return safe;
  }

  async delete(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) {
      throw new AppError(404, "User not found", "not_found");
    }
  }
}

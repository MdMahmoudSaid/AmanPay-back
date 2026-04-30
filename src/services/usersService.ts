import bcrypt from "bcrypt";
import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { User, UserRole } from "../entities/User";

/** Admin users resource exposes internal numeric `id` (not auth public UUID). */
const adminUserSelect = [
  "id",
  "email",
  "fullName",
  "phone",
  "role",
  "createdAt",
  "updatedAt",
] as const;

export type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  role?: UserRole;
};

export type UpdateUserInput = {
  email?: string;
  fullName?: string;
  phone?: string | null;
  role?: UserRole;
  password?: string;
};

export class UsersService {
  private repo = AppDataSource.getRepository(User);
  private async generateReferenceId(): Promise<string> {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let tries = 0; tries < 8; tries += 1) {
      let ref = "";
      for (let i = 0; i < 10; i += 1) {
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
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = this.repo.create({
      email: normalized,
      referenceId: await this.generateReferenceId(),
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone ?? null,
      role: input.role ?? UserRole.USER,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
    const saved = await this.repo.save(user);
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

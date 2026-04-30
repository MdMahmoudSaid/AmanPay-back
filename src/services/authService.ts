import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { IsNull } from "typeorm";
import { AppDataSource } from "../config/database";
import { loadEnv } from "../config/env";
import { AppError } from "../common/errors";
import { User, UserRole } from "../entities/User";
import { RefreshToken } from "../entities/RefreshToken";
import type { SignOptions } from "jsonwebtoken";
import type { AccessTokenClaims } from "../types/auth";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseDurationToMs(spec: string): number {
  const m = /^(\d+)(m|h|d)$/.exec(spec.trim());
  if (!m) {
    throw new AppError(500, "Invalid REFRESH_TOKEN_EXPIRES format", "invalid_duration");
  }
  const n = parseInt(m[1], 10);
  const mul = m[2] === "m" ? 60_000 : m[2] === "h" ? 3_600_000 : 86_400_000;
  return n * mul;
}

/**
 * Public user payload returned by auth/profile endpoints.
 * - `id`: stable public UUID (`users.public_id`) for client-facing use.
 * - `dbUserId`: internal numeric primary key (`users.id`) for server-side relations.
 * - `referenceId`: short transfer handle intended for recipient lookup flows.
 */
export type PublicUser = {
  id: string;
  dbUserId: number;
  referenceId: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

/** Strip to digits for consistent phone storage and lookup (PostgreSQL-safe comparisons). */
function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.publicId,
    dbUserId: user.id,
    referenceId: user.referenceId,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone ?? null,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AuthService {
  private async generateReferenceId(): Promise<string> {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let tries = 0; tries < 8; tries += 1) {
      let ref = "";
      for (let i = 0; i < 10; i += 1) {
        ref += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      const exists = await this.userRepo.findOne({ where: { referenceId: ref }, select: ["id"] });
      if (!exists) return ref;
    }
    throw new AppError(500, "Could not generate unique reference id", "reference_generation_failed");
  }

  private userRepo = AppDataSource.getRepository(User);
  private refreshRepo = AppDataSource.getRepository(RefreshToken);

  private async issueTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const env = loadEnv();
    const payload: AccessTokenClaims = { sub: user.id, role: user.role };
    const signOptions: SignOptions = {
      expiresIn: env.ACCESS_TOKEN_EXPIRES as SignOptions["expiresIn"],
    };
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, signOptions);
    const refreshToken = randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(refreshToken);
    const expiresAt = new Date(Date.now() + parseDurationToMs(env.REFRESH_TOKEN_EXPIRES));
    await this.refreshRepo.save(
      this.refreshRepo.create({
        tokenHash,
        userId: user.id,
        expiresAt,
        revokedAt: null,
      })
    );
    return { accessToken, refreshToken };
  }

  async register(email: string, password: string, fullName: string, phone?: string | null) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email: normalized } });
    if (existing) {
      throw new AppError(409, "Email already registered", "email_taken");
    }
    let phoneNorm: string | null = null;
    if (phone != null && phone.trim() !== "") {
      phoneNorm = normalizePhoneDigits(phone);
      if (phoneNorm.length < 5) {
        throw new AppError(400, "Invalid phone number", "invalid_phone");
      }
      const phoneTaken = await this.userRepo.findOne({ where: { phone: phoneNorm } });
      if (phoneTaken) {
        throw new AppError(409, "Phone already registered", "phone_taken");
      }
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      email: normalized,
      referenceId: await this.generateReferenceId(),
      passwordHash,
      fullName: fullName.trim(),
      phone: phoneNorm,
      role: UserRole.USER,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
    await this.userRepo.save(user);
    const tokens = await this.issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  private readonly loginUserSelect = [
    "id",
    "publicId",
    "referenceId",
    "email",
    "fullName",
    "phone",
    "role",
    "passwordHash",
    "createdAt",
    "updatedAt",
  ] as const;

  /**
   * Sign in with email (contains `@`) or phone number (digits; spacing/format ignored).
   */
  async loginWithIdentifier(identifier: string, password: string) {
    const trimmed = identifier.trim();
    if (!trimmed) {
      throw new AppError(400, "Email or phone is required", "validation_error");
    }

    let user: User | null = null;
    if (trimmed.includes("@")) {
      const email = trimmed.toLowerCase();
      user = await this.userRepo.findOne({
        where: { email },
        select: [...this.loginUserSelect],
      });
    } else {
      if (/[A-Za-z]/.test(trimmed)) {
        throw new AppError(401, "Invalid email or password", "invalid_credentials");
      }
      const digits = normalizePhoneDigits(trimmed);
      if (digits.length < 5) {
        throw new AppError(401, "Invalid email or password", "invalid_credentials");
      }
      user = await this.userRepo
        .createQueryBuilder("u")
        .select(this.loginUserSelect.map((c) => `u.${c}`))
        .where("regexp_replace(COALESCE(u.phone, ''), '[^0-9]', '', 'g') = :digits", { digits })
        .getOne();
    }

    if (!user) {
      throw new AppError(401, "Invalid email or password", "invalid_credentials");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError(401, "Invalid email or password", "invalid_credentials");
    }
    const tokens = await this.issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const hash = sha256Hex(refreshToken);
    const row = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
      relations: ["user"],
    });
    if (!row || row.revokedAt) {
      throw new AppError(403, "Invalid refresh token", "invalid_refresh");
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new AppError(403, "Refresh token expired", "refresh_expired");
    }
    const env = loadEnv();
    await AppDataSource.transaction(async (manager) => {
      row.revokedAt = new Date();
      await manager.getRepository(RefreshToken).save(row);
    });
    const user = await this.userRepo.findOne({ where: { id: row.userId } });
    if (!user) {
      throw new AppError(403, "Invalid refresh token", "invalid_refresh");
    }
    return this.issueTokens(user);
  }

  async logout(refreshToken: string) {
    const hash = sha256Hex(refreshToken);
    await this.refreshRepo.update({ tokenHash: hash }, { revokedAt: new Date() });
  }

  async getMe(userId: number): Promise<PublicUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ["id", "publicId", "referenceId", "email", "fullName", "phone", "role", "createdAt", "updatedAt"],
    });
    if (!user) {
      throw new AppError(404, "User not found", "user_not_found");
    }
    return toPublicUser(user);
  }

  async findRecipientByIdentifier(identifier: string): Promise<PublicUser | null> {
    const q = identifier.trim();
    if (!q) return null;
    if (q.includes("@")) {
      const u = await this.userRepo.findOne({
        where: { email: q.toLowerCase() },
        select: ["id", "publicId", "referenceId", "email", "fullName", "phone", "role", "createdAt", "updatedAt"],
      });
      return u ? toPublicUser(u) : null;
    }
    const digits = normalizePhoneDigits(q);
    // Non-email identifiers can match either referenceId (exact) or normalized phone digits.
    const u = await this.userRepo
      .createQueryBuilder("u")
      .select([
        "u.id",
        "u.publicId",
        "u.referenceId",
        "u.email",
        "u.fullName",
        "u.phone",
        "u.role",
        "u.createdAt",
        "u.updatedAt",
      ])
      .where("u.referenceId = :ref", { ref: q.toUpperCase() })
      .orWhere("regexp_replace(COALESCE(u.phone, ''), '[^0-9]', '', 'g') = :digits", { digits })
      .getOne();
    return u ? toPublicUser(u) : null;
  }

  async forgotPassword(email: string): Promise<{ resetToken?: string }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normalized } });
    if (!user) {
      // Do not leak whether an account exists.
      return {};
    }

    const env = loadEnv();
    const resetToken = randomBytes(32).toString("hex");
    user.passwordResetTokenHash = sha256Hex(resetToken);
    user.passwordResetExpiresAt = new Date(
      Date.now() + parseDurationToMs(env.PASSWORD_RESET_TOKEN_EXPIRES)
    );
    await this.userRepo.save(user);

    // In production you should send by email and never return this token.
    if (env.NODE_ENV !== "production") {
      return { resetToken };
    }
    return {};
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const tokenHash = sha256Hex(resetToken);
    const user = await this.userRepo.findOne({
      where: { passwordResetTokenHash: tokenHash },
    });
    if (!user || !user.passwordResetExpiresAt) {
      throw new AppError(400, "Invalid reset token", "invalid_reset_token");
    }
    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new AppError(400, "Reset token expired", "reset_token_expired");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await this.userRepo.save(user);

    // Revoke all refresh tokens so old sessions cannot continue.
    await this.refreshRepo.update({ userId: user.id, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ["id", "passwordHash"],
    });
    if (!user) {
      throw new AppError(404, "User not found", "user_not_found");
    }

    const validCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validCurrentPassword) {
      throw new AppError(400, "Current password is incorrect", "invalid_current_password");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await this.userRepo.save(user);

    // Revoke active refresh sessions after password change.
    await this.refreshRepo.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}

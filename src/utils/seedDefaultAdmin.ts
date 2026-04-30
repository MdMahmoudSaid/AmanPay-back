import bcrypt from "bcrypt";
import { AppDataSource } from "../config/database";
import { loadEnv } from "../config/env";
import { User, UserRole } from "../entities/User";

export async function seedDefaultAdmin(): Promise<void> {
  const env = loadEnv();
  if (!env.SEED_DEFAULT_ADMIN || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    return;
  }

  const userRepo = AppDataSource.getRepository(User);
  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await userRepo.save(
    userRepo.create({
      email,
      passwordHash,
      fullName: "Administrator",
      phone: null,
      role: UserRole.ADMIN,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    })
  );
  console.info(`Seeded admin user: ${email}`);
}

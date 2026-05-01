import dotenv from "dotenv";

dotenv.config({ quiet: true });

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  /** Only for local dev; never true in production */
  DB_SYNC: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  RUN_MIGRATIONS_ON_START: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  RUN_SEED_ON_START: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES: z.string().default("7d"),
  PASSWORD_RESET_TOKEN_EXPIRES: z.string().default("30m"),
  SEED_DEFAULT_ADMIN: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  const data = parsed.data;
  if (data.NODE_ENV === "production" && data.DB_SYNC) {
    throw new Error("DB_SYNC must not be enabled in production");
  }
  if (data.SEED_DEFAULT_ADMIN) {
    if (!data.ADMIN_EMAIL || !data.ADMIN_PASSWORD) {
      throw new Error("SEED_DEFAULT_ADMIN requires ADMIN_EMAIL and ADMIN_PASSWORD");
    }
  }
  if (data.RUN_SEED_ON_START && data.NODE_ENV === "production") {
    throw new Error("RUN_SEED_ON_START must not be enabled in production");
  }
  cached = data;
  return cached;
}

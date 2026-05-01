import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnvelopeModeAndMerchantRole1738000000005 implements MigrationInterface {
  name = "EnvelopeModeAndMerchantRole1738000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'merchant'`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "merchant_category" character varying(32)`);
    await queryRunner.query(`ALTER TABLE "envelopes" ADD COLUMN IF NOT EXISTS "mode" character varying(16) NOT NULL DEFAULT 'dynamic'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "envelopes" DROP COLUMN IF EXISTS "mode"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "merchant_category"`);
    // Enum value rollback is intentionally skipped in PostgreSQL.
  }
}

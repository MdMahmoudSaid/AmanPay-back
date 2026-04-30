import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPublicAndReferenceIds1738000000003 implements MigrationInterface {
  name = "AddUserPublicAndReferenceIds1738000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "public_id" uuid`);
    await queryRunner.query(`
      UPDATE "users"
      SET "public_id" = gen_random_uuid()
      WHERE "public_id" IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "public_id" SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_public_id" ON "users" ("public_id")`);

    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reference_id" character varying(10)`);
    await queryRunner.query(`
      UPDATE "users"
      SET "reference_id" = ('USR' || LPAD("id"::text, 7, '0'))
      WHERE "reference_id" IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "reference_id" SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_reference_id" ON "users" ("reference_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_reference_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "reference_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_public_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "public_id"`);
  }
}

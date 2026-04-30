import type { MigrationInterface, QueryRunner } from "typeorm";

export class HardenUserIdDefaults1738000000004 implements MigrationInterface {
  name = "HardenUserIdDefaults1738000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "public_id" SET DEFAULT gen_random_uuid()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "public_id" DROP DEFAULT
    `);
  }
}

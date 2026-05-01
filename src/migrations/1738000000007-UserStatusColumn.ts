import type { MigrationInterface, QueryRunner } from "typeorm";

export class UserStatusColumn1738000000007 implements MigrationInterface {
  name = "UserStatusColumn1738000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" character varying(16) NOT NULL DEFAULT 'active'`
    );
    await queryRunner.query(`UPDATE "users" SET "status" = 'active' WHERE "status" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "status"`);
  }
}

import type { MigrationInterface, QueryRunner } from "typeorm";

export class MerchantCategoriesTable1738000000006 implements MigrationInterface {
  name = "MerchantCategoriesTable1738000000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "merchant_categories" (
        "id" SERIAL NOT NULL,
        "code" character varying(32) NOT NULL,
        "display_name" character varying(128) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_merchant_categories_code" UNIQUE ("code"),
        CONSTRAINT "PK_merchant_categories_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "merchant_categories"`);
  }
}

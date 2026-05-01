import type { MigrationInterface, QueryRunner } from "typeorm";

export class CategoryWallets1738000000008 implements MigrationInterface {
  name = "CategoryWallets1738000000008";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "category_wallets" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "category" character varying(64) NOT NULL,
        "strict_balance" numeric(14,2) NOT NULL DEFAULT 0,
        "dynamic_balance" numeric(14,2) NOT NULL DEFAULT 0,
        "currency" character varying(10) NOT NULL DEFAULT 'EUR',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_category_wallets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_category_wallets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_category_wallets_user_category" UNIQUE ("user_id", "category")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "category_wallets"`);
  }
}

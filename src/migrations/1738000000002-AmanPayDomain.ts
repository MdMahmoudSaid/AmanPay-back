import type { MigrationInterface, QueryRunner } from "typeorm";

export class AmanPayDomain1738000000002 implements MigrationInterface {
  name = "AmanPayDomain1738000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "phone" character varying(50)');

    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "total_balance" numeric(14,2) NOT NULL DEFAULT 0,
        "currency" character varying(10) NOT NULL DEFAULT 'EUR',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_wallets_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_wallets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wallets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "partners" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "type" character varying(128) NOT NULL,
        "location" character varying(512) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_partners_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" SERIAL NOT NULL,
        "reference" character varying(128) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "issued_at" TIMESTAMP NOT NULL,
        "status" character varying(64) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transfers" (
        "id" SERIAL NOT NULL,
        "sender_id" integer NOT NULL,
        "receiver_id" integer NOT NULL,
        "total_amount" numeric(14,2) NOT NULL,
        "occurred_at" TIMESTAMP NOT NULL,
        "type" character varying(64) NOT NULL,
        "status" character varying(64) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transfers_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transfers_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_transfers_receiver" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "envelopes" (
        "id" SERIAL NOT NULL,
        "transfer_id" integer NOT NULL,
        "type" character varying(64) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "status" character varying(64) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_envelopes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_envelopes_transfer" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_transactions" (
        "id" SERIAL NOT NULL,
        "envelope_id" integer NOT NULL,
        "partner_id" integer NOT NULL,
        "invoice_id" integer,
        "amount" numeric(14,2) NOT NULL,
        "type" character varying(64) NOT NULL,
        "occurred_at" TIMESTAMP NOT NULL,
        "status" character varying(64) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payment_transactions_envelope" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_payment_transactions_partner" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_payment_transactions_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "unblock_requests" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "envelope_id" integer NOT NULL,
        "reason" text NOT NULL,
        "status" character varying(64) NOT NULL,
        "requested_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unblock_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_unblock_requests_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_unblock_requests_envelope" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "money_requests" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "category" character varying(128) NOT NULL,
        "status" character varying(64) NOT NULL,
        "requested_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_money_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_money_requests_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "activity_history" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "action" character varying(512) NOT NULL,
        "occurred_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_activity_history_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "activity_history"`);
    await queryRunner.query(`DROP TABLE "money_requests"`);
    await queryRunner.query(`DROP TABLE "unblock_requests"`);
    await queryRunner.query(`DROP TABLE "payment_transactions"`);
    await queryRunner.query(`DROP TABLE "envelopes"`);
    await queryRunner.query(`DROP TABLE "transfers"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TABLE "partners"`);
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "phone"');
  }
}

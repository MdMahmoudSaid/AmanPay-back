import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Envelope } from "./Envelope";
import { Partner } from "./Partner";
import { Invoice } from "./Invoice";

@Entity("payment_transactions")
export class PaymentTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Envelope, (e) => e.transactions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "envelope_id" })
  envelope!: Envelope;

  @ManyToOne(() => Partner, (p) => p.transactions, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "partner_id" })
  partner!: Partner;

  @ManyToOne(() => Invoice, (inv) => inv.transactions, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "invoice_id" })
  invoice!: Invoice | null;

  @Column({ type: "decimal", precision: 14, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 64 })
  type!: string;

  @Column({ name: "occurred_at", type: "timestamp" })
  occurredAt!: Date;

  @Column({ type: "varchar", length: 64 })
  status!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

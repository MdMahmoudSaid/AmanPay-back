import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { PaymentTransaction } from "./PaymentTransaction";

@Entity("invoices")
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 128 })
  reference!: string;

  @Column({ type: "decimal", precision: 14, scale: 2 })
  amount!: string;

  @Column({ name: "issued_at", type: "timestamp" })
  issuedAt!: Date;

  @Column({ length: 64 })
  status!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => PaymentTransaction, (tx) => tx.invoice)
  transactions?: PaymentTransaction[];
}

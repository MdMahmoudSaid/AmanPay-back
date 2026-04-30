import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Transfer } from "./Transfer";
import { PaymentTransaction } from "./PaymentTransaction";
import { UnblockRequest } from "./UnblockRequest";

@Entity("envelopes")
export class Envelope {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Transfer, (t) => t.envelopes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "transfer_id" })
  transfer!: Transfer;

  @Column({ length: 64 })
  type!: string;

  @Column({ type: "decimal", precision: 14, scale: 2 })
  amount!: string;

  @Column({ length: 64 })
  status!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => PaymentTransaction, (tx) => tx.envelope)
  transactions?: PaymentTransaction[];

  @OneToMany(() => UnblockRequest, (r) => r.envelope)
  unblockRequests?: UnblockRequest[];
}

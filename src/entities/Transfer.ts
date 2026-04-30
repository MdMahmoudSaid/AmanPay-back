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
import { User } from "./User";
import { Envelope } from "./Envelope";

@Entity("transfers")
export class Transfer {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (u) => u.transfersSent, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "sender_id" })
  sender!: User;

  @ManyToOne(() => User, (u) => u.transfersReceived, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "receiver_id" })
  receiver!: User;

  @Column({ name: "total_amount", type: "decimal", precision: 14, scale: 2 })
  totalAmount!: string;

  @Column({ name: "occurred_at", type: "timestamp" })
  occurredAt!: Date;

  @Column({ type: "varchar", length: 64 })
  type!: string;

  @Column({ type: "varchar", length: 64 })
  status!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => Envelope, (e) => e.transfer)
  envelopes?: Envelope[];
}

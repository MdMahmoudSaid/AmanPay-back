import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Envelope } from "./Envelope";

@Entity("unblock_requests")
export class UnblockRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (u) => u.unblockRequests, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Envelope, (e) => e.unblockRequests, { onDelete: "CASCADE" })
  @JoinColumn({ name: "envelope_id" })
  envelope!: Envelope;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "varchar", length: 64 })
  status!: string;

  @Column({ name: "requested_at", type: "timestamp" })
  requestedAt!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

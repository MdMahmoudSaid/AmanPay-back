import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("activity_history")
export class ActivityHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (u) => u.activityHistory, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 512 })
  action!: string;

  @Column({ name: "occurred_at", type: "timestamp" })
  occurredAt!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Generated,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from "typeorm";
import { RefreshToken } from "./RefreshToken";
import { Wallet } from "./Wallet";
import { Transfer } from "./Transfer";
import { UnblockRequest } from "./UnblockRequest";
import { MoneyRequest } from "./MoneyRequest";
import { ActivityHistory } from "./ActivityHistory";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "public_id", type: "uuid", unique: true })
  @Generated("uuid")
  publicId!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: "reference_id", unique: true, length: 10 })
  referenceId!: string;

  @Column({ name: "password_hash", length: 255 })
  passwordHash!: string;

  @Column({ name: "full_name", length: 255 })
  fullName!: string;

  @Column({ name: "phone", type: "varchar", length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ name: "password_reset_token_hash", type: "varchar", length: 64, nullable: true })
  passwordResetTokenHash!: string | null;

  @Column({ name: "password_reset_expires_at", type: "timestamp", nullable: true })
  passwordResetExpiresAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => RefreshToken, (t) => t.user)
  refreshTokens?: RefreshToken[];

  @OneToOne(() => Wallet, (w) => w.user)
  wallet?: Wallet;

  @OneToMany(() => Transfer, (t) => t.sender)
  transfersSent?: Transfer[];

  @OneToMany(() => Transfer, (t) => t.receiver)
  transfersReceived?: Transfer[];

  @OneToMany(() => UnblockRequest, (r) => r.user)
  unblockRequests?: UnblockRequest[];

  @OneToMany(() => MoneyRequest, (r) => r.user)
  moneyRequests?: MoneyRequest[];

  @OneToMany(() => ActivityHistory, (h) => h.user)
  activityHistory?: ActivityHistory[];
}

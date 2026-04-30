import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("wallets")
export class Wallet {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, (u) => u.wallet, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "total_balance", type: "decimal", precision: 14, scale: 2, default: 0 })
  totalBalance!: string;

  @Column({ length: 10, default: "EUR" })
  currency!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

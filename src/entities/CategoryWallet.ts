import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { User } from "./User";

@Entity("category_wallets")
@Unique("UQ_category_wallets_user_category", ["user", "category"])
export class CategoryWallet {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (u) => u.categoryWallets, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 64 })
  category!: string;

  @Column({ name: "strict_balance", type: "decimal", precision: 14, scale: 2, default: 0 })
  strictBalance!: string;

  @Column({ name: "dynamic_balance", type: "decimal", precision: 14, scale: 2, default: 0 })
  dynamicBalance!: string;

  @Column({ type: "varchar", length: 10, default: "EUR" })
  currency!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

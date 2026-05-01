import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("merchant_categories")
export class MerchantCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 32, unique: true })
  code!: string;

  @Column({ name: "display_name", type: "varchar", length: 128 })
  displayName!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

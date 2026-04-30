import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { PaymentTransaction } from "./PaymentTransaction";

@Entity("partners")
export class Partner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 128 })
  type!: string;

  @Column({ type: "varchar", length: 512 })
  location!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => PaymentTransaction, (tx) => tx.partner)
  transactions?: PaymentTransaction[];
}

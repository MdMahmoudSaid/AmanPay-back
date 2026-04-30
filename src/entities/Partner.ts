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

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 128 })
  type!: string;

  @Column({ length: 512 })
  location!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => PaymentTransaction, (tx) => tx.partner)
  transactions?: PaymentTransaction[];
}

import { Entity, PrimaryColumn, Column, Index } from "typeorm";
import { getDateType, getCurrentDate } from "./OrmAnnotationTypes";

@Entity({ name: 'pending_coins' })
@Index(["expiresAt"])
export class PendingCoin {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'coin_id' })
  coinId!: string;

  @Column({ type: getDateType(), name: 'expires_at', nullable: false, default: () => getCurrentDate(5) })
  expiresAt!: Date;

  @Column({ type: getDateType(), name: 'created_at', nullable: true, default: () => getCurrentDate() })
  createdAt?: Date;
}

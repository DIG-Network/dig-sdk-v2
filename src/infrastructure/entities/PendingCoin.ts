import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { getDateType } from './OrmAnnotationTypes';

@Entity()
@Index(["coinId"])
@Index(["expirey"])
export class PendingCoin {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'text', name: 'coin_id' })
  coinId!: string;

  @Column({ type: getDateType(), name: 'expirey' })
  expirey!: Date;
}

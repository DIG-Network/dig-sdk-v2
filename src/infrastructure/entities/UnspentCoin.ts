import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class UnspentCoin {
  @PrimaryColumn()
  coinId?: string;

  @Column()
  parentCoinInfo!: string;

  @Column()
  puzzleHash!: string;

  @Column('bigint')
  amount!: string;
}
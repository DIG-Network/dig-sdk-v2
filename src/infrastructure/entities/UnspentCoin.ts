import { Entity, PrimaryColumn, Column } from 'typeorm';
import { getBinaryType } from './OrmAnnotationTypes';

@Entity({ name: 'unspent_coins' })
export class UnspentCoin {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'coin_id' })
  coinId!: string;

  @Column({ type: getBinaryType(), name: 'parent_coin_info', nullable: false })
  parentCoinInfo!: Buffer;

  @Column({ type: getBinaryType(), name: 'puzzle_hash', nullable: false })
  puzzleHash!: Buffer;

  @Column({ type: 'bigint', name: 'amount', nullable: false })
  amount!: string;
}
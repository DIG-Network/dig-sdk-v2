import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity()
@Index(["parentCoinInfo"])
@Index(["puzzleHash"])
@Index(["amount"])
export class Coin {
  @PrimaryColumn({ type: 'text', name: 'coin_id' })
  coinId!: string;

  @Column({ type: 'text', name: 'parent_coin_info' })
  parentCoinInfo!: string;

  @Column({ type: 'text', name: 'puzzle_hash' })
  puzzleHash!: string;

  @Column({ type: 'bigint', name: 'amount' })
  amount!: string;
}

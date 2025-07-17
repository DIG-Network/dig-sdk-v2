import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity()
@Index(["parentCoinInfo"])
@Index(["puzzleHash"])
@Index(["amount"])
export class Coin {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'coin_id' })
  coinId!: string;

  @Column({ type: 'varchar', length: 255, name: 'parent_coin_info' })
  parentCoinInfo!: string;

  @Column({ type: 'varchar', length: 255, name: 'puzzle_hash' })
  puzzleHash!: string;

  @Column({ type: 'bigint', name: 'amount' })
  amount!: string;
}

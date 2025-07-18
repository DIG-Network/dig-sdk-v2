import { Entity, PrimaryColumn, Column, Index } from "typeorm";
import { getBinaryType } from "./OrmAnnotationTypes";

@Entity({ name: 'coins' })
@Index(["parentCoinInfo"])
@Index(["puzzleHash"])
@Index(["amount"])
@Index(["createdBlock"])
export class Coin {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'coin_id' })
  coinId!: string;

  @Column({ type: getBinaryType(), name: 'parent_coin_info', nullable: false })
  parentCoinInfo!: Buffer;

  @Column({ type: getBinaryType(), name: 'puzzle_hash', nullable: false })
  puzzleHash!: Buffer;

  @Column({ type: 'bigint', name: 'amount', nullable: false })
  amount!: string;

  @Column({ type: 'bigint', name: 'created_block', nullable: true })
  createdBlock?: string;
}

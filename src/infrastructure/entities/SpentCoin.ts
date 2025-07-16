import { Entity, PrimaryColumn, Column, Index } from "typeorm";
import { getBinaryType } from "./OrmAnnotationTypes";

@Entity()
@Index(["addressId"])
@Index(["coinStatus"])
@Index(["assetId"])
export class SpentCoin {
  @PrimaryColumn({ type: 'text' })
  addressId!: string;

  @PrimaryColumn({ type: getBinaryType() })
  coinId!: Buffer;

  @Column({ type: getBinaryType() })
  parentCoinInfo!: Buffer;

  @Column({ type: getBinaryType() })
  puzzleHash!: Buffer;

  @Column({ type: 'text' })
  amount!: string;

  @Column({ type: 'integer' })
  syncedHeight!: number;

  @Column({ type: 'text' })
  coinStatus!: string;

  @Column({ type: 'text', default: "xch" })
  assetId: string = "xch";

  @Column({ type: 'text' })
  puzzleReveal!: string;

  @Column({ type: 'text' })
  solution!: string;

  @Column({ type: 'integer' })
  offset!: number;
}

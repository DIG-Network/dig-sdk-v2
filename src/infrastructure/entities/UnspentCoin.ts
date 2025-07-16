import { ViewEntity, ViewColumn } from "typeorm";

@ViewEntity({ name: "unspent_coins" })
export class UnspentCoin {
  @ViewColumn()
  addressId!: string;

  @ViewColumn()
  coinId!: Buffer;

  @ViewColumn()
  parentCoinInfo!: Buffer;

  @ViewColumn()
  puzzleHash!: Buffer;

  @ViewColumn()
  amount!: string;

  @ViewColumn()
  syncedHeight!: number;

  @ViewColumn()
  coinStatus!: string;

  @ViewColumn()
  assetId!: string;
}
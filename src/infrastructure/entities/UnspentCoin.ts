import { ViewEntity, ViewColumn } from "typeorm";

import { DataSource } from "typeorm";

@ViewEntity({
  name: "unspent_coins",
  expression: (connection: DataSource) => connection.createQueryBuilder().select("*").from("unspent_coins", "unspent_coins")
})
export class UnspentCoin {
  @ViewColumn({ name: 'coin_id' })
  coinId!: string;

  @ViewColumn({ name: 'parent_coin_info' })
  parentCoinInfo!: string;

  @ViewColumn({ name: 'puzzle_hash' })
  puzzleHash!: string;

  @ViewColumn({ name: 'amount' })
  amount!: string;
}
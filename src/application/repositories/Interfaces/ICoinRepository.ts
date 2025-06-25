import { CoinRow } from '../CoinRepository';

export interface ICoinRepository {
  upsertCoin(wallet_id: string, coin: { coinId: Buffer, parent_coin_info: Buffer, puzzle_hash: Buffer, amount: bigint, synced_height: number, status: string }): void;
  getCoins(wallet_id: string): CoinRow[];
  getPendingCoins(): CoinRow[];
  updateCoinStatus(wallet_id: string, coinId: Buffer, status: string, synced_height: number): void;
}

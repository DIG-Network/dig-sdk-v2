import { CoinStatus } from '../../types/CoinStatus';
import { CoinRow } from '../CoinRepository';

export interface ICoinRepository {
  upsertCoin(walletId: string, coin: { coinId: Buffer, parentCoinInfo: Buffer, puzzleHash: Buffer, amount: bigint, syncedHeight: number, status: CoinStatus }): void;
  getCoins(walletId: string): CoinRow[];
  getAllCoins(): CoinRow[];
  getPendingCoins(): CoinRow[];
  updateCoinStatus(walletId: string, coinId: Buffer, status: CoinStatus, syncedHeight: number): void;
}

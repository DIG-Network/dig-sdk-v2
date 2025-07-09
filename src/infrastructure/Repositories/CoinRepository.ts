import Database from 'better-sqlite3';
import { CoinStatus } from './CoinStatus';
import { IAssetBalance } from '../../application/types/AssetBalance';
import { WALLET_DB_FILE } from '../../application/repositories/WalletRepository';

export interface CoinRow {
  walletId: string;
  coinId: Buffer;
  parentCoinInfo: Buffer;
  puzzleHash: Buffer;
  amount: bigint;
  syncedHeight: number;
  status: CoinStatus;
  assetId: string;
}

export const COIN_TABLE_CREATE_SQL = `
        CREATE TABLE IF NOT EXISTS coin (
        walletId TEXT,
        coinId BLOB,
        parentCoinInfo BLOB,
        puzzleHash BLOB,
        amount TEXT,
        syncedHeight INTEGER,
        status TEXT CHECK(status IN ('unspent', 'pending', 'spent')),
        assetId TEXT DEFAULT 'xch',
        PRIMARY KEY (walletId, coinId)
        );
        CREATE INDEX IF NOT EXISTS idx_coin_walletId ON coin(walletId);
        CREATE INDEX IF NOT EXISTS idx_coin_status ON coin(status);
        CREATE INDEX IF NOT EXISTS idx_coin_assetId ON coin(assetId);
    `;

let setupTable = (db: Database.Database) => {
    db.exec(COIN_TABLE_CREATE_SQL);
}

export interface ICoinRepository {
  upsertCoin(walletId: string, coin: { coinId: Buffer, parentCoinInfo: Buffer, puzzleHash: Buffer, amount: bigint, syncedHeight: number, status: CoinStatus, assetId?: string }): void;
  getCoins(walletId: string): CoinRow[];
  getAllCoins(): CoinRow[];
  getPendingCoins(): CoinRow[];
  updateCoinStatus(walletId: string, coinId: Buffer, status: CoinStatus, syncedHeight: number): void;
  getBalancesByAsset(walletId: string): IAssetBalance[];
  getBalance(walletId: string, assetId: string): bigint;
}

export class CoinRepository implements ICoinRepository {
  private db: Database.Database;

  constructor() {
    this.db = new Database(WALLET_DB_FILE);
    setupTable(this.db);
  }

  upsertCoin(walletId: string, coin: { coinId: Buffer, parentCoinInfo: Buffer, puzzleHash: Buffer, amount: bigint, syncedHeight: number, status: string, assetId?: string }) {
    this.db.prepare(
      `INSERT OR REPLACE INTO coin (walletId, coinId, parentCoinInfo, puzzleHash, amount, syncedHeight, status, assetId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      walletId,
      coin.coinId,
      coin.parentCoinInfo,
      coin.puzzleHash,
      coin.amount.toString(),
      coin.syncedHeight,
      coin.status,
      coin.assetId || 'xch'
    );
  }

  getAllCoins(): CoinRow[] {
    return this.db.prepare('SELECT * FROM coin').all() as CoinRow[];
  }

  getCoins(walletId: string): CoinRow[] {
    return this.db.prepare('SELECT * FROM coin WHERE walletId = ?').all(walletId) as CoinRow[];
  }

  getPendingCoins(): CoinRow[] {
    return this.db.prepare('SELECT * FROM coin WHERE status = ?').all(CoinStatus.PENDING) as CoinRow[];
  }

  updateCoinStatus(walletId: string, coinId: Buffer, status: CoinStatus, syncedHeight: number) {
    this.db.prepare(
      `UPDATE coin SET status = ?, syncedHeight = ? WHERE walletId = ? AND coinId = ?`
    ).run(status, syncedHeight, walletId, coinId);
  }

  getBalancesByAsset(walletId: string): IAssetBalance[] {
    const rows = this.db.prepare(
      `SELECT assetId, SUM(CAST(amount AS INTEGER)) as balance FROM coin WHERE walletId = ? AND status = ? GROUP BY assetId`
    ).all(walletId, CoinStatus.UNSPENT) as { assetId: string, balance: string }[];
    return rows.map(row => ({ assetId: row.assetId, balance: BigInt(row.balance) }));
  }

  getBalance(walletId: string, assetId: string): bigint {
    const row = this.db.prepare(
      `SELECT SUM(CAST(amount AS INTEGER)) as balance FROM coin WHERE walletId = ? AND assetId = ? AND status = ?`
    ).get(walletId, assetId, CoinStatus.UNSPENT) as { balance: string } | undefined;
    return row && row.balance ? BigInt(row.balance) : 0n;
  }
}

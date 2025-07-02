import Database from 'better-sqlite3';
import { ICoinRepository } from './Interfaces/ICoinRepository';
import { CoinStatus } from '../types/CoinStatus';

export interface CoinRow {
  walletId: string;
  coinId: Buffer;
  parentCoinInfo: Buffer;
  puzzleHash: Buffer;
  amount: bigint;
  syncedHeight: number;
  status: CoinStatus;
}

let setupTable = (db: Database.Database) => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS coin (
        walletId TEXT,
        coinId BLOB,
        parentCoinInfo BLOB,
        puzzleHash BLOB,
        amount TEXT,
        syncedHeight INTEGER,
        status TEXT CHECK(status IN ('unspent', 'pending', 'spent')),
        PRIMARY KEY (walletId, coinId)
        );
        CREATE INDEX IF NOT EXISTS idx_coin_walletId ON coin(walletId);
        CREATE INDEX IF NOT EXISTS idx_coin_status ON coin(status);
    `);
}

export class CoinRepository implements ICoinRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    setupTable(db);
  }

  upsertCoin(walletId: string, coin: { coinId: Buffer, parentCoinInfo: Buffer, puzzleHash: Buffer, amount: bigint, syncedHeight: number, status: string }) {
    this.db.prepare(
      `INSERT OR REPLACE INTO coin (walletId, coinId, parentCoinInfo, puzzleHash, amount, syncedHeight, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      walletId,
      coin.coinId,
      coin.parentCoinInfo,
      coin.puzzleHash,
      coin.amount.toString(),
      coin.syncedHeight,
      coin.status
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
}

import Database from 'better-sqlite3';
import { ICoinRepository } from './Interfaces/ICoinRepository';

export interface CoinRow {
  wallet_id: string;
  coinId: Buffer;
  parent_coin_info: Buffer;
  puzzle_hash: Buffer;
  amount: bigint;
  synced_height: number;
  status: 'unspent' | 'pending' | 'spent';
}

let setupTable = (db: Database.Database) => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS coin (
        wallet_id TEXT,
        coinId BLOB,
        parent_coin_info BLOB,
        puzzle_hash BLOB,
        amount TEXT,
        synced_height INTEGER,
        status TEXT CHECK(status IN ('unspent', 'pending', 'spent')),
        PRIMARY KEY (wallet_id, coinId)
        );
        CREATE INDEX IF NOT EXISTS idx_coin_wallet_id ON coin(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_coin_status ON coin(status);
    `);
}

export class CoinRepository implements ICoinRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    setupTable(db);
  }

  upsertCoin(wallet_id: string, coin: { coinId: Buffer, parent_coin_info: Buffer, puzzle_hash: Buffer, amount: bigint, synced_height: number, status: string }) {
    this.db.prepare(
      `INSERT OR REPLACE INTO coin (wallet_id, coinId, parent_coin_info, puzzle_hash, amount, synced_height, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      wallet_id,
      coin.coinId,
      coin.parent_coin_info,
      coin.puzzle_hash,
      coin.amount.toString(),
      coin.synced_height,
      coin.status
    );
  }

  getCoins(wallet_id: string): CoinRow[] {
    return this.db.prepare('SELECT * FROM coin WHERE wallet_id = ?').all(wallet_id) as CoinRow[];
  }

  getPendingCoins(): CoinRow[] {
    return this.db.prepare('SELECT * FROM coin WHERE status = ?').all('pending') as CoinRow[];
  }

  updateCoinStatus(wallet_id: string, coinId: Buffer, status: string, synced_height: number) {
    this.db.prepare(
      `UPDATE coin SET status = ?, synced_height = ? WHERE wallet_id = ? AND coinId = ?`
    ).run(status, synced_height, wallet_id, coinId);
  }
}

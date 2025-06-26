import Database from 'better-sqlite3';
import { IWalletRepository } from './Interfaces/IWalletRepository';

export interface WalletRow {
  address: string;
  namespace: string;
  synced_to_height: number;
  synced_to_hash: string;
}

let setupTable = (db: Database.Database) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS wallet (
        address TEXT PRIMARY KEY,
        namespace TEXT DEFAULT 'default',
        synced_to_height INTEGER,
        synced_to_hash TEXT
      );
    `);
  }

export class WalletRepository implements IWalletRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    setupTable(db);
  }

  addWallet(address: string, namespace: string = 'default') {
    this.db.prepare(
      `INSERT OR IGNORE INTO wallet (address, namespace) VALUES (?, ?)`
    ).run(address, namespace);
  }

  updateWalletSync(address: string, synced_to_height: number, synced_to_hash: string) {
    this.db.prepare(
      `UPDATE wallet SET synced_to_height = ?, synced_to_hash = ? WHERE address = ?`
    ).run(synced_to_height, synced_to_hash, address);
  }

  getWallets(): WalletRow[] {
    return this.db.prepare('SELECT * FROM wallet').all() as WalletRow[];
  }
}

import Database from 'better-sqlite3';
import { IWalletRepository } from './Interfaces/IWalletRepository';

export interface AddressRow {
  address: string;
  namespace: string;
  synced_to_height: number;
  synced_to_hash: string;
  name?: string; // Add wallet name as optional field
}

export let setupTable = (db: Database.Database) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS wallet (
        address TEXT PRIMARY KEY,
        namespace TEXT DEFAULT 'default',
        synced_to_height INTEGER,
        synced_to_hash TEXT,
        name TEXT UNIQUE
      );
    `);
  }

export class WalletRepository implements IWalletRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    setupTable(db);
  }

  addAddress(address: string, name: string, namespace: string = 'default', synchedToHeight: number = 0, synchedToHash: string = '') {
    // Prevent duplicate names
    const exists = this.db.prepare('SELECT 1 FROM wallet WHERE name = ?').get(name);
    if (exists) throw new Error('Wallet with this name already exists');
    this.db.prepare(
      `INSERT OR IGNORE INTO wallet (address, namespace, name, synced_to_height, synced_to_hash) VALUES (?, ?, ?, ?, ?)`
    ).run(address, namespace, name, synchedToHeight, synchedToHash);
  }

  updateWalletSync(address: string, synced_to_height: number, synced_to_hash: string) {
    this.db.prepare(
      `UPDATE wallet SET synced_to_height = ?, synced_to_hash = ? WHERE address = ?`
    ).run(synced_to_height, synced_to_hash, address);
  }

  removeWallet(address: string) {
    this.db.prepare(
      `DELETE FROM wallet WHERE address = ?`
    ).run(address);
  }

  removeAddressByName(name: string) {
    this.db.prepare(
      `DELETE FROM wallet WHERE name = ?`
    ).run(name);
  }

  getAddresses(): AddressRow[] {
    return this.db.prepare('SELECT * FROM wallet').all() as AddressRow[];
  }
}

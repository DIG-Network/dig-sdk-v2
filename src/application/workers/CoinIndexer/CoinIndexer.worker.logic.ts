import Database from 'better-sqlite3';
import { CoinIndexerEvents, CoinStateUpdatedEvent } from './CoinIndexerEvents';

let db: Database.Database | null = null;
let events: CoinIndexerEvents | null = null;
let started = false;

function setupTables() {
  db!.exec(`
    CREATE TABLE IF NOT EXISTS wallet (
      address TEXT PRIMARY KEY,
      namespace TEXT DEFAULT 'default',
      synced_to_height INTEGER,
      synced_to_hash TEXT
    );
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

export const api = {
  start(_blockchainType: string, dbPath: string = './coin_indexer.sqlite') {
    if (started) return;
    db = new Database(dbPath);
    events = new CoinIndexerEvents();
    setupTables();
    started = true;
  },
  stop() {
    started = false;
    db = null;
    events = null;
  },
  addWallet(address: string, namespace: string = 'default') {
    db!.prepare(
      `INSERT OR IGNORE INTO wallet (address, namespace) VALUES (?, ?)`
    ).run(address, namespace);
  },
  updateWalletSync(address: string, synced_to_height: number, synced_to_hash: string) {
    db!.prepare(
      `UPDATE wallet SET synced_to_height = ?, synced_to_hash = ? WHERE address = ?`
    ).run(synced_to_height, synced_to_hash, address);
  },
  upsertCoin(wallet_id: string, coin: { coinId: Buffer, parent_coin_info: Buffer, puzzle_hash: Buffer, amount: bigint, synced_height: number, status: string }) {
    db!.prepare(
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
    // Emit event for coin state update
    if (events) {
      const event: CoinStateUpdatedEvent = {
        wallet_id,
        coinId: coin.coinId,
        status: coin.status as 'unspent' | 'pending' | 'spent',
        synced_height: coin.synced_height,
      };
      events.emitCoinStateUpdated(event);
    }
  },
  getWallets() {
    return db!.prepare('SELECT * FROM wallet').all();
  },
  getCoins(wallet_id: string) {
    return db!.prepare('SELECT * FROM coin WHERE wallet_id = ?').all(wallet_id);
  },
  onCoinStateUpdated(listener: (event: CoinStateUpdatedEvent) => void) {
    if (!events) throw new Error('CoinIndexerEvents not initialized');
    events.onCoinStateUpdated(listener);
  },
  __reset() {
    db = null;
    events = null;
    started = false;
  },
};

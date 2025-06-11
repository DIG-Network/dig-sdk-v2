import Database from 'better-sqlite3';
import crypto from 'crypto';
import { Observable } from 'observable-fns';
import { Block } from './BlockIndexer.worker';

let db: Database.Database | null = null;
let intervalId: NodeJS.Timeout | null = null;
let initialized = false;
let started = false;

let hashObservable: Observable<Block> | null = null;
let hashObserver: ((block: Block) => void) | null = null;

// just for testing purposes, after integration with the blockchain can be removed
let blockHeight = 0; // Placeholder for block height, can be used for testing

export const api = {
  initialize(dbPath: string = './block_indexer.sqlite') {
    if (initialized) return;
    db = new Database(dbPath);
    db.exec(`CREATE TABLE IF NOT EXISTS blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT, blockHeight INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    initialized = true;
  },
  start() {
    if (!initialized) throw new Error('BlockIndexer must be initialized before starting.');
    if (started) return;
    started = true;
    intervalId = setInterval(api.ingest, 1600);
  },
  stop() {
    if (intervalId) clearInterval(intervalId);
    started = false;
  },
  ingest() {
    const hash = crypto.createHash('sha256').update(Date.now().toString() + Math.random().toString()).digest('hex');
    blockHeight++; // Increment block height for testing purposes
    if (db) {
      db.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run(hash, blockHeight);
    }
    if (hashObserver) hashObserver({hash, blockHeight});
    return hash;
  },
  onHashGenerated() {
    if (!hashObservable) {
      hashObservable = new Observable<Block>(observer => {
        hashObserver = (block: Block) => observer.next(block);
        return () => { hashObserver = null; };
      });
    }
    return hashObservable;
  },
  getAllHashes() {
    if (!db) return [];
    type Row = { hash: string };
    return (db.prepare('SELECT hash FROM blocks').all() as Row[]).map(row => row.hash);
  },
  getLatestHash() {
    if (!db) return [];
    return (db.prepare('SELECT hash FROM blocks ORDER BY blockHeight DESC TAKE 1').all() as Block[]);
  },
  // For testing: reset all state
  __reset() {
    if (intervalId) clearInterval(intervalId);
    if (db) db.close();
    db = null;
    intervalId = null;
    initialized = false;
    started = false;
    hashObservable = null;
    hashObserver = null;
  }
};

import Database from 'better-sqlite3';
import crypto from 'crypto';
import { Observable } from 'observable-fns';

let db: Database.Database | null = null;
let intervalId: NodeJS.Timeout | null = null;
let initialized = false;
let started = false;

let hashObservable: Observable<string> | null = null;
let hashObserver: ((hash: string) => void) | null = null;

export const api = {
  initialize(dbPath: string = './block_indexer.sqlite') {
    if (initialized) return;
    db = new Database(dbPath);
    db.exec(`CREATE TABLE IF NOT EXISTS hashes (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
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
    if (db) {
      db.prepare('INSERT INTO hashes (hash) VALUES (?)').run(hash);
    }
    if (hashObserver) hashObserver(hash);
    return hash;
  },
  onHashGenerated() {
    if (!hashObservable) {
      hashObservable = new Observable<string>(observer => {
        hashObserver = (hash: string) => observer.next(hash);
        return () => { hashObserver = null; };
      });
    }
    return hashObservable;
  },
  getAllHashes() {
    if (!db) return [];
    type Row = { hash: string };
    return (db.prepare('SELECT hash FROM hashes').all() as Row[]).map(row => row.hash);
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

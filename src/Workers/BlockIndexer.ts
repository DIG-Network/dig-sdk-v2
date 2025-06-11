import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import crypto from 'crypto';

export interface BlockIndexerEvents {
  on(event: 'hashGenerated', listener: (hash: string) => void): this;
  emit(event: 'hashGenerated', hash: string): boolean;
}

export interface IBlockIndexer {
  initialize(dbPath?: string): void;
  start(): void;
  stop(): void;
  subscribe(listener: (hash: string) => void): void;
  getAllHashes(): string[];
}

export class BlockIndexerNotInitialized extends Error {
  constructor() {
    super('BlockIndexer must be initialized before starting.');
    this.name = 'BlockIndexerNotInitialized';
  }
}

export class BlockIndexer extends (EventEmitter as { new(): BlockIndexerEvents }) implements IBlockIndexer {
  private db: Database.Database | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private initialized = false;
  private started = false;

  initialize(dbPath: string = './block_indexer.sqlite'): void {
    if (this.initialized) return;
    this.db = new Database(dbPath);
    this.db.exec(`CREATE TABLE IF NOT EXISTS hashes (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    this.initialized = true;
  }

  start() {
    if (!this.initialized) throw new BlockIndexerNotInitialized();
    if (this.started) return;
    this.started = true;
    this.intervalId = setInterval(() => this.ingest(), 16000);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.started = false;
  }

  private ingest() {
    const hash = crypto.createHash('sha256').update(Date.now().toString() + Math.random().toString()).digest('hex');
    if (this.db) {
      this.db.prepare('INSERT INTO hashes (hash) VALUES (?)').run(hash);
    }
    this.emit('hashGenerated', hash);
  }

  subscribe(listener: (hash: string) => void) {
    this.on('hashGenerated', listener);
  }

  getAllHashes(): string[] {
    if (!this.db) return [];
    type Row = { hash: string };
    return (this.db.prepare('SELECT hash FROM hashes').all() as Row[]).map(row => row.hash);
  }
}

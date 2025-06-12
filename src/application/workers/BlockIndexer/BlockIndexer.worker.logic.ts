import Database from 'better-sqlite3';
import crypto from 'crypto';
import { Observable } from 'observable-fns';
import { IBlockchainService } from '../../IBlockChainService';
import { BlockChainType } from '../../types/BlockChain';
import { ChiaBlockchainService } from '../../../infrastructure/BlockchainServices/ChiaBlockchainService';
import { Block } from '../../types/Block';

let db: Database.Database | null = null;
let intervalId: NodeJS.Timeout | null = null;
let initialized = false;
let started = false;

let hashObservable: Observable<Block> | null = null;
let hashObserver: ((block: Block) => void) | null = null;

let blockHeight = 0;

let blockchainService: IBlockchainService;

export const api = {
  /**
   * Initialize the BlockIndexer worker.
   * @param blockchainType String to select blockchain service.
   * @param dbPath Path to the SQLite database file.
   */
  async initialize(blockchainType: string, dbPath: string = './block_indexer.sqlite') {
    if (initialized) return;
    db = new Database(dbPath);
    db.exec(`CREATE TABLE IF NOT EXISTS blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT, blockHeight INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

    switch (blockchainType) {
      case BlockChainType.Chia:
      default:
        blockchainService = new ChiaBlockchainService();
        break;
    }

    const row = db.prepare('SELECT MAX(blockHeight) as maxHeight FROM blocks').get() as { maxHeight?: number };
    blockHeight = row && typeof row.maxHeight === 'number' && !isNaN(row.maxHeight) ? row.maxHeight : 0;

    const blockchainHeight = await blockchainService.getCurrentBlockchainHeight();
    if (blockchainHeight > blockHeight) {
      for (let h = blockHeight + 1; h <= blockchainHeight; h++) {
        const block = await blockchainService.getBlockchainBlockByHeight(h);
        if (block && db) {
          db.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run(block.hash, block.blockHeight);
        }
        blockHeight = h;
      }
    }
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

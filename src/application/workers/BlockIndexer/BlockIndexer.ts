import { EventEmitter } from 'events';
import { spawn, Worker, Thread } from 'threads';
import { Block } from '../../types/Block';
import { IWorker } from '../IWorker';
import { BlockIndexerEventNames, BlockIndexerEvents } from './BlockIndexerEvents';
import Database from 'better-sqlite3';

interface BlockIndexerWorkerApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => any;
}

interface IBlockIndexer extends IWorker {
  onBlockIngested(listener: (block: Block) => void): void
  getLatestBlock(): Promise<Block>
  getBlockByHeight(height: number): Promise<Block>
}

export class BlockIndexer extends (EventEmitter as { new(): BlockIndexerEvents }) implements IBlockIndexer {
  private worker: import('threads').ModuleThread<BlockIndexerWorkerApi> | null = null;
  private initialized = false;
  private started = false;
  private db: Database.Database | null = null;

  async start(
    blockchainType: string,
    dbPath: string = './block_indexer.sqlite'
  ): Promise<void> {
    if (this.initialized) return;

    this.db = new Database(dbPath);

    // Use src worker for tests/dev, dist worker for production
    let workerPath: string;
    if (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test') {
      workerPath = '../../../../dist/application/workers/BlockIndexer/BlockIndexer.worker.js';
    } else {
      workerPath = './BlockIndexer.worker.ts';
    }
    
    this.worker = (await spawn(new Worker(workerPath))) as import('threads').ModuleThread<BlockIndexerWorkerApi>;
    
    this.worker.onBlockIngested().subscribe((block: Block) => {
      this.emit(BlockIndexerEventNames.BlockIngested, block);
    });
    
    await this.worker.start(blockchainType, dbPath);

    this.initialized = true;
  }

  async stop(): Promise<void> {
    if (this.started && this.worker) await this.worker.stop();
    this.started = false;
    if (this.worker) await Thread.terminate(this.worker);
  }

  onBlockIngested(listener: (block: Block) => void) {
    this.on(BlockIndexerEventNames.BlockIngested, listener);
  }

  async getLatestBlock(): Promise<Block> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM blocks ORDER BY blockHeight DESC LIMIT 1');
    const block = stmt.get() as { hash: Buffer, blockHeight: number } | undefined;
    if (!block) throw new Error('No blocks found');
    return {
      hash: block.hash.toString('hex'),
      blockHeight: block.blockHeight,
    };
  }

  async getBlockByHeight(height: number): Promise<Block> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM blocks WHERE blockHeight = ?');
    const block = stmt.get(height) as { hash: Buffer, blockHeight: number } | undefined;
    if (!block) throw new Error(`Block with height ${height} not found`);
    return {
      hash: block.hash.toString('hex'),
      blockHeight: block.blockHeight,
    };
  } 
}

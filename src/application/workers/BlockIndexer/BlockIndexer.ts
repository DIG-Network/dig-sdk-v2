import { EventEmitter } from 'events';
import { spawn, Worker, Thread } from 'threads';
import { Block } from '../../types/Block';
import { IWorker } from '../IWorker';

const enum BlockIndexerEventNames {
    HashGenerated = 'hashGenerated',
}

export interface BlockIndexerEvents {
  on(event: BlockIndexerEventNames.HashGenerated, listener: (block: Block) => void): this;
  emit(event: BlockIndexerEventNames.HashGenerated, block: Block): boolean;
}

export class BlockIndexerNotInitialized extends Error {
  constructor() {
    super('BlockIndexer must be initialized before starting.');
    this.name = 'BlockIndexerNotInitialized';
  }
}

export interface BlockIndexerWorkerApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => any;
}

export class BlockIndexer extends (EventEmitter as { new(): BlockIndexerEvents }) implements IWorker {
  private worker: import('threads').ModuleThread<BlockIndexerWorkerApi> | null = null;
  private initialized = false;
  private started = false;

  async initialize(
    blockchainType: string,
    dbPath: string = './block_indexer.sqlite'
  ): Promise<void> {
    if (this.initialized) return;

    // Use src worker for tests/dev, dist worker for production
    let workerPath: string;
    if (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test') {
      workerPath = '../../../../dist/application/workers/BlockIndexer/BlockIndexer.worker.js';
    } else {
      workerPath = './BlockIndexer.worker.ts';
    }
    
    this.worker = (await spawn(new Worker(workerPath))) as import('threads').ModuleThread<BlockIndexerWorkerApi>;
    await this.worker.initialize(blockchainType, dbPath);
    this.initialized = true;
  }

  async start(): Promise<void> {
    if (!this.initialized) throw new BlockIndexerNotInitialized();
    if (this.started) return;
    this.started = true;
    
    this.worker!.onHashGenerated().subscribe((block: Block) => {
      this.emit(BlockIndexerEventNames.HashGenerated, block);
    });
    
    await this.worker!.start();
  }

  async stop(): Promise<void> {
    if (this.started && this.worker) await this.worker.stop();
    this.started = false;
    if (this.worker) await Thread.terminate(this.worker);
  }

  subscribe(listener: (block: Block) => void) {
    this.on(BlockIndexerEventNames.HashGenerated, listener);
  }

  async getAllHashes(): Promise<string[]> {
    if (!this.worker) return [];
    return (await this.worker.getAllHashes()) as string[];
  }

  async getLatestHash(): Promise<Block[]> {
    if (!this.worker) return [];
    return (await this.worker.getLatestHash()) as Block[];
  }
}

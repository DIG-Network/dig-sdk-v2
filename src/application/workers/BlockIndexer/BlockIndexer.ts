import { EventEmitter } from 'events';
import { spawn, Worker, Thread } from 'threads';
import { Block } from '../../types/Block';
import { IWorker } from '../IWorker';
import { BlockIndexerEventNames, BlockIndexerEvents } from './BlockIndexerEvents';

interface BlockIndexerWorkerApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => any;
}

interface IBlockIndexer extends IWorker {
  onBlockIngested(listener: (block: Block) => void): void;
}

export class BlockIndexer extends (EventEmitter as { new(): BlockIndexerEvents }) implements IBlockIndexer {
  private worker: import('threads').ModuleThread<BlockIndexerWorkerApi> | null = null;
  private initialized = false;
  private started = false;

  async start(
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
}

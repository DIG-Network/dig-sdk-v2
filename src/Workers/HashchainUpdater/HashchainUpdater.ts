import { spawn, Worker } from 'threads';
import { BlockIndexer } from '../BlockIndexer/BlockIndexer';
import { Block } from '../BlockIndexer/BlockIndexer.worker';

export interface HashchainUpdaterWorkerApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => any;
}

export class HashchainUpdater {
  private worker: import('threads').ModuleThread<HashchainUpdaterWorkerApi> | null = null;
  private initialized = false;
  private dbPath: string;

  constructor(private blockIndexer: BlockIndexer, dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(publicKey: string): Promise<void> {
    if (this.initialized) return;
    let workerPath: string;
    if (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test') {
      workerPath = '../../../dist/Workers/HashchainUpdater/HashchainUpdater.worker.js';
    } else {
      workerPath = './HashchainUpdater.worker.ts';
    }
    this.worker = (await spawn(new Worker(workerPath))) as import('threads').ModuleThread<HashchainUpdaterWorkerApi>;
    await this.worker.initialize(publicKey);
    // Subscribe to new blocks and forward them to the worker
    this.blockIndexer.subscribe(async (block) => {
      if (this.worker) await this.worker.recalculate(block);
    });
    this.initialized = true;
  }

  async dispose(): Promise<void> {
    if (this.worker && this.worker.__unsubscribe) await this.worker.__unsubscribe();
    this.initialized = false;
  }

  async recalculate(block: Block): Promise<void> {
    if (this.worker) await this.worker.recalculate(block);
  }
}

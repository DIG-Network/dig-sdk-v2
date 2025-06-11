import { spawn, Worker } from 'threads';
import { BlockIndexer } from '../BlockIndexer/BlockIndexer';

export interface HashchainUpdaterWorkerApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => any;
}

export class HashchainUpdater {
  private worker: import('threads').ModuleThread<HashchainUpdaterWorkerApi> | null = null;
  private initialized = false;

  constructor(private blockIndexer: BlockIndexer) {}

  async initialize(publicKey: string): Promise<void> {
    if (this.initialized) return;
    this.worker = (await spawn(new Worker('./HashchainUpdater.worker.ts'))) as import('threads').ModuleThread<HashchainUpdaterWorkerApi>;
    await this.worker.initialize(this.blockIndexer, publicKey);
    this.initialized = true;
  }

  async recalculate(hash: string): Promise<void> {
    if (this.worker) await this.worker.recalculate(hash);
  }

  async dispose(): Promise<void> {
    if (this.worker && this.worker.__unsubscribe) await this.worker.__unsubscribe();
    this.initialized = false;
  }
}

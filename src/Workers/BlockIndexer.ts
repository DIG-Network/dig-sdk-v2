import { EventEmitter } from 'events';
import { spawn, Worker, Thread } from 'threads';

const enum BlockIndexerEventNames {
    HashGenerated = 'hashGenerated',
}

export interface BlockIndexerEvents {
  on(event: BlockIndexerEventNames.HashGenerated, listener: (hash: string) => void): this;
  emit(event: BlockIndexerEventNames.HashGenerated, hash: string): boolean;
}

export interface IBlockIndexer {
  initialize(dbPath?: string): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  subscribe(listener: (hash: string) => void): void;
  getAllHashes(): Promise<string[]>;
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

export class BlockIndexer extends (EventEmitter as { new(): BlockIndexerEvents }) implements IBlockIndexer {
  private worker: import('threads').ModuleThread<BlockIndexerWorkerApi> | null = null;
  private initialized = false;
  private started = false;

  async initialize(dbPath: string = './block_indexer.sqlite'): Promise<void> {
    if (this.initialized) return;
    this.worker = (await spawn(new Worker('./BlockIndexer.worker'))) as import('threads').ModuleThread<BlockIndexerWorkerApi>;
    await this.worker.initialize(dbPath);
    this.initialized = true;
  }

  async start(): Promise<void> {
    if (!this.initialized) throw new BlockIndexerNotInitialized();
    if (this.started) return;
    this.started = true;
    
    this.worker!.onHashGenerated().subscribe((hash: string) => {
      this.emit(BlockIndexerEventNames.HashGenerated, hash);
    });
    
    await this.worker!.start();
  }

  async stop(): Promise<void> {
    if (this.started && this.worker) await this.worker.stop();
    this.started = false;
    if (this.worker) await Thread.terminate(this.worker);
  }

  subscribe(listener: (hash: string) => void) {
    this.on(BlockIndexerEventNames.HashGenerated, listener);
  }

  async getAllHashes(): Promise<string[]> {
    if (!this.worker) return [];
    return (await this.worker.getAllHashes()) as string[];
  }
}

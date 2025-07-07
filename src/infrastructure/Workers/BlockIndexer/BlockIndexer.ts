import { EventEmitter } from 'events';
import { spawn, Worker, Thread } from 'threads';
import { IWorker } from '../IWorker';
import { Block } from '../../../application/types/Block';
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
  private started = false;
  private restartIntervalId: NodeJS.Timeout | null = null;
  private restartIntervalMs: number | null = null;

  async start(
    blockchainType: string,
    restartIntervalHours?: number
  ): Promise<void> {
    await this.startWorker(blockchainType);

    if (restartIntervalHours && restartIntervalHours > 0) {
      this.restartIntervalMs = restartIntervalHours * 60 * 60 * 1000;
      this.restartIntervalId = setInterval(async () => {
        await this.restartWorker(blockchainType);
      }, this.restartIntervalMs);
    }
  }

  private async startWorker(blockchainType: string) {
    if (this.started) return;
    if (!this.worker) {
      // Use src worker for tests/dev, dist worker for production
      let workerPath: string;
      if (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test') {
        workerPath = '../../../../dist/infrastructure/Workers/BlockIndexer/BlockIndexer.worker.js';
      } else {
        workerPath = './BlockIndexer.worker.ts';
      }
      this.worker = (await spawn(new Worker(workerPath))) as import('threads').ModuleThread<BlockIndexerWorkerApi>;
    }

    this.worker.onBlockIngested().subscribe((block: Block) => {
      this.emit(BlockIndexerEventNames.BlockIngested, block);
    });

    try {
      await this.worker.start(blockchainType);
    } catch {
      await this.restartWorker(blockchainType);
    }

    this.started = true;
  }

  private async restartWorker(blockchainType: string) {
    if (this.worker) {
      await this.worker.stop();
      this.started = false;
      await Thread.terminate(this.worker);
      this.worker = null;
    }

    await this.startWorker(blockchainType);
  }

  async stop(): Promise<void> {
    if (this.started && this.worker) await this.worker.stop();
    this.started = false;
    if (this.worker) await Thread.terminate(this.worker);
    if (this.restartIntervalId) {
      clearInterval(this.restartIntervalId);
      this.restartIntervalId = null;
    }
  }

  onBlockIngested(listener: (block: Block) => void) {
    this.on(BlockIndexerEventNames.BlockIngested, listener);
  }
}

import { EventEmitter } from 'events';
import { spawn, Worker, Thread } from 'threads';
import { PeerType } from '@dignetwork/datalayer-driver';
import { IWorker } from '../IWorker';
import { CoinIndexerEventNames, CoinIndexerEvents, CoinStateUpdatedEvent } from './CoinIndexerEvents';

export interface CoinIndexerWorkerApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => any;
}

interface ICoinIndexer extends IWorker {
  onCoinStateUpdated(listener: (coinState: CoinStateUpdatedEvent) => void): void;
}

export class CoinIndexer
  extends (EventEmitter as { new (): CoinIndexerEvents })
  implements ICoinIndexer
{
  private worker: import('threads').ModuleThread<CoinIndexerWorkerApi> | null = null;
  private started = false;
  private restartIntervalId: NodeJS.Timeout | null = null;
  private restartIntervalMs: number | null = null;

  async start(
    blockchainType: string,
    restartIntervalHours?: number,
    crtPath: string = 'ca.crt',
    keyPath: string = 'ca.key',
    peerType?: PeerType,
  ): Promise<void> {
    await this.startWorker(blockchainType, crtPath, keyPath, peerType);

    if (restartIntervalHours && restartIntervalHours > 0) {
      this.restartIntervalMs = restartIntervalHours * 60 * 60 * 1000;
      this.restartIntervalId = setInterval(async () => {
        await this.restartWorker(blockchainType, crtPath, keyPath, peerType);
      }, this.restartIntervalMs);
    }
  }

  private async startWorker(
    blockchainType: string,
    crtPath: string = 'ca.crt',
    keyPath: string = 'ca.key',
    peerType?: PeerType,
  ) {
    if (this.started) return;
    if (!this.worker) {
      // Use src worker for tests/dev, dist worker for production
      let workerPath = '../../../../dist/infrastructure/Workers/CoinIndexer/CoinIndexer.worker.js';

      this.worker = (await spawn(
        new Worker(workerPath),
      )) as import('threads').ModuleThread<CoinIndexerWorkerApi>;
    }

    this.worker.onCoinStateUpdated().subscribe({
      next: (coinState: CoinStateUpdatedEvent) => {
        this.emit(CoinIndexerEventNames.CoinStateUpdated, coinState);
      },
    });

    try {
      await this.worker.start(blockchainType, crtPath, keyPath, peerType);
    } catch {
      await this.restartWorker(blockchainType, crtPath, keyPath, peerType);
    }

    this.started = true;
  }

  private async restartWorker(
    blockchainType: string,
    crtPath: string = 'ca.crt',
    keyPath: string = 'ca.key',
    peerType?: PeerType,
  ) {
    if (this.worker) {
      await this.worker.stop();
      this.started = false;
      await Thread.terminate(this.worker);
      this.worker = null;
    }
    await this.startWorker(blockchainType, crtPath, keyPath, peerType);
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

  onCoinStateUpdated(listener: (coinState: CoinStateUpdatedEvent) => void): void {
    this.on(CoinIndexerEventNames.CoinStateUpdated, listener);
  }
}

import { EventEmitter } from 'events';

export enum CoinIndexerEventNames {
  CoinStateUpdated = 'CoinStateUpdated',
}

export interface CoinStateUpdatedEvent {
  wallet_id: string;
  coinId: Buffer;
  status: 'unspent' | 'pending' | 'spent';
  synced_height: number;
}

export class CoinIndexerEvents extends EventEmitter {
  emitCoinStateUpdated(event: CoinStateUpdatedEvent) {
    this.emit(CoinIndexerEventNames.CoinStateUpdated, event);
  }
  onCoinStateUpdated(listener: (event: CoinStateUpdatedEvent) => void) {
    this.on(CoinIndexerEventNames.CoinStateUpdated, listener);
  }
}
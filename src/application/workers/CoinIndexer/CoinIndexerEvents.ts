export enum CoinIndexerEventNames {
  CoinStateUpdated = 'coinStateUpdated',
}

export interface CoinStateUpdatedEvent {
  wallet_id: string;
  coinId: Buffer;
  status: 'unspent' | 'pending' | 'spent';
  synced_height: number;
}

export interface CoinIndexerEvents {
  on(event: CoinIndexerEventNames.CoinStateUpdated, listener: (event: CoinStateUpdatedEvent) => void): this;
  emit(event: CoinIndexerEventNames.CoinStateUpdated, eventData: CoinStateUpdatedEvent): boolean;
}
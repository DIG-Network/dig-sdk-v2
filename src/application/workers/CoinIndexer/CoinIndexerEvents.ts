import { CoinStatus } from "../../types/CoinStatus";

export enum CoinIndexerEventNames {
  CoinStateUpdated = 'coinStateUpdated',
}

export interface CoinStateUpdatedEvent {
  walletId: string;
  coinId: Buffer;
  status: CoinStatus;
  syncedHeight: number;
}

export interface CoinIndexerEvents {
  on(event: CoinIndexerEventNames.CoinStateUpdated, listener: (event: CoinStateUpdatedEvent) => void): this;
  emit(event: CoinIndexerEventNames.CoinStateUpdated, eventData: CoinStateUpdatedEvent): boolean;
}
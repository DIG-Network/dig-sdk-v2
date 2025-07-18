import { CoinStatus } from "../../Repositories/CoinStatus";

export enum CoinIndexerEventNames {
  CoinStateUpdated = 'coinStateUpdated',
}

export interface CoinStateUpdatedEvent {
  addressId: string;
  coinId: Buffer;
  status: CoinStatus;
  syncedHeight: number;
}

export interface CoinIndexerEvents {
  on(event: CoinIndexerEventNames.CoinStateUpdated, listener: (event: CoinStateUpdatedEvent) => void): this;
  emit(event: CoinIndexerEventNames.CoinStateUpdated, eventData: CoinStateUpdatedEvent): boolean;
}
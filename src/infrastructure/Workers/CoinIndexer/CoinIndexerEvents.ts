import { CoinStatus } from "../../Repositories/CoinStatus";

export enum CoinIndexerEventNames {
  CoinStateUpdated = 'coinStateUpdated',
  NewBlockIngested = 'newBlockIngested',
}

export interface CoinStateUpdatedEvent {
  coinId: string;
  coinStatus: CoinStatus;
  syncedHeight: number;
}

export interface NewBlockIngestedEvent {
  height: string;
  weight: string;
  headerHash: Buffer;
  timestamp?: Date;
}

export interface CoinIndexerEvents {
  on(event: CoinIndexerEventNames.CoinStateUpdated, listener: (event: CoinStateUpdatedEvent) => void): this;
  emit(event: CoinIndexerEventNames.CoinStateUpdated, eventData: CoinStateUpdatedEvent): boolean;

  on(event: CoinIndexerEventNames.NewBlockIngested, listener: (event: NewBlockIngestedEvent) => void): this;
  emit(event: CoinIndexerEventNames.NewBlockIngested, eventData: NewBlockIngestedEvent): boolean;
}
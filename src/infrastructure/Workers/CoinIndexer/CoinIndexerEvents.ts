import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { Block } from '../../../application/entities/Block';

export enum CoinIndexerEventNames {
  CoinCreated = 'coinCreated',
  SpendCreated = 'spendCreated',
  NewBlockIngested = 'newBlockIngested',
}

// Use generic Event<T> for all entity events
export interface CoinIndexerEvents {
  on(event: CoinIndexerEventNames.CoinCreated, listener: (event: CoinRecord ) => void): this;
  emit(event: CoinIndexerEventNames.CoinCreated, eventData: CoinRecord ): boolean;

  on(event: CoinIndexerEventNames.SpendCreated, listener: (event: CoinSpend) => void): this;
  emit(event: CoinIndexerEventNames.SpendCreated, eventData: CoinSpend): boolean;

  on(event: CoinIndexerEventNames.NewBlockIngested, listener: (event: Block) => void): this;
  emit(event: CoinIndexerEventNames.NewBlockIngested, eventData: Block): boolean;
}
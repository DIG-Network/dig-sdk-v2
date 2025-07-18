import { Block } from '../../../application/entities/Block';
import { Coin } from '../../entities/Coin';
import { Spend } from '../../entities/Spend';

export enum CoinIndexerEventNames {
  CoinCreated = 'coinCreated',
  SpendCreated = 'spendCreated',
  NewBlockIngested = 'newBlockIngested',
}

// Use generic Event<T> for all entity events
export interface CoinIndexerEvents {
  on(event: CoinIndexerEventNames.CoinCreated, listener: (event: Coin ) => void): this;
  emit(event: CoinIndexerEventNames.CoinCreated, eventData: Coin ): boolean;

  on(event: CoinIndexerEventNames.SpendCreated, listener: (event: Spend) => void): this;
  emit(event: CoinIndexerEventNames.SpendCreated, eventData: Spend ): boolean;

  on(event: CoinIndexerEventNames.NewBlockIngested, listener: (event: Block) => void): this;
  emit(event: CoinIndexerEventNames.NewBlockIngested, eventData: Block): boolean;
}
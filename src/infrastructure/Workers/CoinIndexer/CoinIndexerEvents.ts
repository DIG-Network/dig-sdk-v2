import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { Block } from '../../../application/entities/Block';
import { Nft } from './Nft';
import { Cat } from './AssetCats';


export enum CoinIndexerEventNames {
  CoinCreated = 'coinCreated',
  SpendCreated = 'spendCreated',
  NewBlockIngested = 'newBlockIngested',
  NftCreated = 'nftCreated',
  CatCreated = 'catCreated',
}

// Use generic Event<T> for all entity events
export interface CoinIndexerEvents {
  on(event: CoinIndexerEventNames.CoinCreated, listener: (event: CoinRecord ) => void): this;
  emit(event: CoinIndexerEventNames.CoinCreated, eventData: CoinRecord ): boolean;

  on(event: CoinIndexerEventNames.SpendCreated, listener: (event: CoinSpend) => void): this;
  emit(event: CoinIndexerEventNames.SpendCreated, eventData: CoinSpend): boolean;

  on(event: CoinIndexerEventNames.NewBlockIngested, listener: (event: Block) => void): this;
  emit(event: CoinIndexerEventNames.NewBlockIngested, eventData: Block): boolean;

  on(event: CoinIndexerEventNames.NftCreated, listener: (event: Nft) => void): this;
  emit(event: CoinIndexerEventNames.NftCreated, eventData: Nft): boolean;

  on(event: CoinIndexerEventNames.CatCreated, listener: (event: Cat) => void): this;
  emit(event: CoinIndexerEventNames.CatCreated, eventData: Cat): boolean;
}
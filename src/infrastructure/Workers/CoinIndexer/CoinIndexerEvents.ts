import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { Block } from '../../../application/entities/Block';
import { Nft } from './Nft';
import { Cat } from './AssetCats';


export enum CoinIndexerEventNames {
  CoinCreated = 'coinCreated',
  SpendCreated = 'spendCreated',
  NewBlockIngested = 'newBlockIngested',
  NftSpend = 'nftSpend',
  CatSpend = 'catSpend',
  DidSpend = 'didSpend',
  StreamedCatSpend = 'streamedCatSpend',
  ClawbackSpend = 'clawbackSpend',
}

// Use generic Event<T> for all entity events
export interface CoinIndexerEvents {
  on(event: CoinIndexerEventNames.CoinCreated, listener: (event: CoinRecord ) => void): this;
  emit(event: CoinIndexerEventNames.CoinCreated, eventData: CoinRecord ): boolean;

  on(event: CoinIndexerEventNames.SpendCreated, listener: (event: CoinSpend) => void): this;
  emit(event: CoinIndexerEventNames.SpendCreated, eventData: CoinSpend): boolean;

  on(event: CoinIndexerEventNames.NewBlockIngested, listener: (event: Block) => void): this;
  emit(event: CoinIndexerEventNames.NewBlockIngested, eventData: Block): boolean;

  on(event: CoinIndexerEventNames.NftSpend, listener: (event: Nft) => void): this;
  emit(event: CoinIndexerEventNames.NftSpend, eventData: Nft): boolean;

  on(event: CoinIndexerEventNames.CatSpend, listener: (event: Cat) => void): this;
  emit(event: CoinIndexerEventNames.CatSpend, eventData: Cat): boolean;

  on(event: CoinIndexerEventNames.DidSpend, listener: (event: any) => void): this;
  emit(event: CoinIndexerEventNames.DidSpend, eventData: any): boolean;

  on(event: CoinIndexerEventNames.StreamedCatSpend, listener: (event: any) => void): this;
  emit(event: CoinIndexerEventNames.StreamedCatSpend, eventData: any): boolean;

  on(event: CoinIndexerEventNames.ClawbackSpend, listener: (event: any) => void): this;
  emit(event: CoinIndexerEventNames.ClawbackSpend, eventData: any): boolean;
}
import { IAssetBalance } from '../../types/AssetBalance';

export interface IBalanceRepository {
  getBalancesByAsset(address: string): IAssetBalance[];
  getBalance(address: string, assetId: string): bigint;
}

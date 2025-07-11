import { IAssetBalance } from '../../types/AssetBalance';

export interface IBalanceRepository {
  getBalancesByAsset(address: string): Promise<IAssetBalance[]>;
  getBalance(address: string, assetId: string): Promise<bigint>;
}

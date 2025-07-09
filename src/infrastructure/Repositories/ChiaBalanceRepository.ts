import { IBalanceRepository } from "../../application/repositories/Interfaces/IBalanceRepository";
import { IAssetBalance } from "../../application/types/AssetBalance";
import { CoinRepository, ICoinRepository } from "./CoinRepository";

export class ChiaBalanceRepository implements IBalanceRepository {
    private coinRepository: ICoinRepository = new CoinRepository();

    public async getBalancesByAsset(address: string): Promise<IAssetBalance[]> {
        return this.coinRepository.getBalancesByAsset(address);
    }
    public async getBalance(address: string, assetId: string): Promise<bigint> {
        return this.coinRepository.getBalance(address, assetId);
    }
}
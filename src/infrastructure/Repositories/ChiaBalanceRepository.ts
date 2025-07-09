import { IBalanceRepository } from "../../application/repositories/Interfaces/IBalanceRepository";
import { IAssetBalance } from "../../application/types/AssetBalance";
import { CoinRepository, ICoinRepository } from "./CoinRepository";

export class ChiaBalanceRepository implements IBalanceRepository {
    private coinRepository: ICoinRepository = new CoinRepository();

    public getBalancesByAsset(address: string): IAssetBalance[] {
        return this.coinRepository.getBalancesByAsset(address);
    }
    public getBalance(address: string, assetId: string): bigint {
        return this.coinRepository.getBalance(address, assetId);
    }
}
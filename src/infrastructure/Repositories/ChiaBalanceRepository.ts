import { IBalanceRepository } from "../../application/repositories/Interfaces/IBalanceRepository";
import { CoinRepository, ICoinRepository } from "./CoinRepository";

export class ChiaBalanceRepository implements IBalanceRepository {
    private coinRepository: ICoinRepository = new CoinRepository();

    public async getBalance(address: string, assetId: string): Promise<bigint> {
        return this.coinRepository.getBalance(address, assetId);
    }
}
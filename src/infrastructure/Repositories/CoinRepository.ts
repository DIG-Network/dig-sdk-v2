import { getDataSource } from '../DatabaseProvider';
import { Coin } from '../entities/Coin';
import { Spend } from '../entities/Spend';
import { PendingCoin } from '../entities/PendingCoin';
import { UnspentCoin } from '../entities/UnspentCoin';
import { ChiaBlockchainService } from '../BlockchainServices/ChiaBlockchainService';
import { EntityManager } from 'typeorm';

export interface ICoinRepository {
  addCoin(coin: Coin, managerParam?: EntityManager): Promise<void>;
  getCoin(coinId: string, managerParam?: EntityManager): Promise<Coin | undefined>;
  getAllCoins(managerParam?: EntityManager): Promise<Coin[]>;
  addSpend(spend: Spend, managerParam?: EntityManager): Promise<void>;
  getAllSpends(managerParam?: EntityManager): Promise<Spend[]>;
  addPendingCoin(pending: PendingCoin, managerParam?: EntityManager): Promise<void>;
  getPendingCoins(managerParam?: EntityManager): Promise<PendingCoin[]>;
  getPendingCoin(coinId: string, managerParam?: EntityManager): Promise<PendingCoin | undefined>;
  getUnspentCoins(address: string, managerParam?: EntityManager): Promise<UnspentCoin[]>;
  deleteUnspentCoin(coinId: string, managerParam?: EntityManager): Promise<void>;
  addUnspentCoin(coin: UnspentCoin, managerParam?: EntityManager): Promise<void>;
  getBalance(address: string, managerParam?: EntityManager): bigint | PromiseLike<bigint>;
}

export class CoinRepository implements ICoinRepository {
  async addCoin(coin: Coin, managerParam?: EntityManager): Promise<void> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(Coin);
    try {
      const newCoin = repo.create(coin);
      await repo.save(newCoin);
    } catch {}
  }

  async getCoin(coinId: string, managerParam?: EntityManager): Promise<Coin | undefined> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(Coin);
    const found = await repo.findOne({ where: { coinId } });
    return found ? { ...found } : undefined;
  }

  async getAllCoins(managerParam?: EntityManager): Promise<Coin[]> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(Coin);
    return (await repo.find()).map((c) => ({ ...c }));
  }

  async addSpend(spend: Spend, managerParam?: EntityManager): Promise<void> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(Spend);
    const newSpend = repo.create(spend);
    await repo.save(newSpend);
  }

  async getAllSpends(managerParam?: EntityManager): Promise<Spend[]> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(Spend);
    return (await repo.find()).map((s) => ({ ...s }));
  }

  async addPendingCoin(pending: PendingCoin, managerParam?: EntityManager): Promise<void> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(PendingCoin);
    const newPending = repo.create(pending);
    await repo.save(newPending);
  }

  async getPendingCoins(managerParam?: EntityManager): Promise<PendingCoin[]> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(PendingCoin);
    return (await repo.find()).map((p) => ({ ...p }));
  }

  async getPendingCoin(
    coinId: string,
    managerParam?: EntityManager,
  ): Promise<PendingCoin | undefined> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(PendingCoin);
    const found = await repo.findOne({ where: { coinId } });
    return found ? { ...found } : undefined;
  }

  async addUnspentCoin(coin: UnspentCoin, managerParam?: EntityManager): Promise<void> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(UnspentCoin);
    await repo.upsert(coin, ['coinId']);
  }

  async getUnspentCoins(address: string, managerParam?: EntityManager): Promise<UnspentCoin[]> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(UnspentCoin);
    const puzzleHash = ChiaBlockchainService.getPuzzleHash(address).toString('hex');
    return (await repo.find({ where: { puzzleHash } })).map((c) => ({ ...c }));
  }

  async deleteUnspentCoin(coinId: string, managerParam?: EntityManager) {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(UnspentCoin);
    await repo.delete({ coinId });
  }

  async getBalance(address: string, managerParam?: EntityManager): Promise<bigint> {
    const manager = managerParam || (await getDataSource());
    const repo = manager.getRepository(UnspentCoin);
    const puzzleHash = ChiaBlockchainService.getPuzzleHash(address).toString('hex');
    const coins = await repo.find({ where: { puzzleHash } });
    return coins.reduce((sum, coin) => sum + BigInt(coin.amount), 0n);
  }
}

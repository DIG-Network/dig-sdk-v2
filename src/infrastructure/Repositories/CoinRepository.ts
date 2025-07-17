import { getDataSource } from '../DatabaseProvider';
import { Coin } from '../entities/Coin';
import { Spend } from '../entities/Spend';
import { PendingCoin } from '../entities/PendingCoin';
import { UnspentCoin } from '../entities/UnspentCoin';
import { ChiaBlockchainService } from '../BlockchainServices/ChiaBlockchainService';

export interface ICoinRepository {
  upsertCoin(coin: Coin): Promise<void>;
  getCoin(coinId: string): Promise<Coin | undefined>;
  getAllCoins(): Promise<Coin[]>;
  addSpend(spend: Spend): Promise<void>;
  getAllSpends(): Promise<Spend[]>;
  addPendingCoin(pending: PendingCoin): Promise<void>;
  getPendingCoins(): Promise<PendingCoin[]>;
  getPendingCoin(coinId: string): Promise<PendingCoin | undefined>;
  getUnspentCoins(address: string): Promise<UnspentCoin[]>;
  getBalance(address: string, assetId: string): bigint | PromiseLike<bigint>;
}

export class CoinRepository implements ICoinRepository {
  async upsertCoin(coin: Coin): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Coin);
    const existing = await repo.findOne({ where: { coinId: coin.coinId } });
    if (existing) {
      await repo.update({ coinId: coin.coinId }, coin);
    } else {
      try {
        const newCoin = repo.create(coin);
        await repo.save(newCoin);
      } catch {}
    }
  }

  async getCoin(coinId: string): Promise<Coin | undefined> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Coin);
    const found = await repo.findOne({ where: { coinId } });
    return found ? { ...found } : undefined;
  }

  async getAllCoins(): Promise<Coin[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Coin);
    return (await repo.find()).map((c) => ({ ...c }));
  }

  async addSpend(spend: Spend): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Spend);
    const newSpend = repo.create(spend);
    await repo.save(newSpend);
  }

  async getAllSpends(): Promise<Spend[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Spend);
    return (await repo.find()).map((s) => ({ ...s }));
  }

  async addPendingCoin(pending: PendingCoin): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(PendingCoin);
    const newPending = repo.create(pending);
    await repo.save(newPending);
  }

  async getPendingCoins(): Promise<PendingCoin[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(PendingCoin);
    return (await repo.find()).map((p) => ({ ...p }));
  }

  async getPendingCoin(coinId: string): Promise<PendingCoin | undefined> {
    const ds = await getDataSource();
    const repo = ds.getRepository(PendingCoin);
    const found = await repo.findOne({ where: { coinId } });
    return found ? { ...found } : undefined;
  }

  async getUnspentCoins(address: string): Promise<UnspentCoin[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UnspentCoin);
    const puzzleHash = ChiaBlockchainService.getPuzzleHash(address).toString('hex');
    return (await repo.find({ where: { puzzleHash } })).map((c) => ({ ...c }));
  }

  async getBalance(address: string): Promise<bigint> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UnspentCoin);
    const puzzleHash = ChiaBlockchainService.getPuzzleHash(address).toString('hex');
    const coins = await repo.find({ where: { puzzleHash } });
    return coins.reduce((sum, coin) => sum + BigInt(coin.amount), 0n);
  }
}

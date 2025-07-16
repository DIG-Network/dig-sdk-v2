

import { getDataSource } from '../DatabaseProvider';
import { CoinStatus } from './CoinStatus';
import { IAssetBalance } from '../../application/types/AssetBalance';
import { AddedCoin } from '../entities/AddedCoin';
import { SpentCoin } from '../entities/SpentCoin';

export interface AddedCoinRow {
  addressId: string;
  coinId: Buffer;
  parentCoinInfo: Buffer;
  puzzleHash: Buffer;
  amount: bigint;
  syncedHeight: number;
  coinStatus: CoinStatus;
  assetId: string;
}

export interface SpentCoinRow {
  addressId: string;
  coinId: Buffer;
  parentCoinInfo: Buffer;
  puzzleHash: Buffer;
  amount: bigint;
  syncedHeight: number;
  coinStatus: CoinStatus;
  assetId: string;
  puzzleReveal: string;
  solution: string;
  offset: number;
}

export interface ICoinRepository {
  upsertAddedCoin(addressId: string, coin: AddedCoinRow): Promise<void>;
  getAddedCoins(addressId: string): Promise<AddedCoinRow[]>;
  getAllAddedCoins(): Promise<AddedCoinRow[]>;
  getPendingAddedCoins(): Promise<AddedCoinRow[]>;
  updateAddedCoinStatus(addressId: string, coinId: Buffer, status: CoinStatus, syncedHeight: number): Promise<void>;
  getBalancesByAsset(addressId: string): Promise<IAssetBalance[]>;
  getBalance(addressId: string, assetId: string): Promise<bigint>;
  addSpentCoin(addressId: string, spentCoin: SpentCoinRow): Promise<void>;
  getSpentCoins(addressId: string): Promise<SpentCoinRow[]>;
  getCoins(addressId: string): Promise<AddedCoinRow[]>;
}

function toAddedCoinRow(ormAddedCoin: AddedCoin): AddedCoinRow {
  return {
    addressId: ormAddedCoin.addressId,
    coinId: ormAddedCoin.coinId,
    parentCoinInfo: ormAddedCoin.parentCoinInfo,
    puzzleHash: ormAddedCoin.puzzleHash,
    amount: BigInt(ormAddedCoin.amount),
    syncedHeight: ormAddedCoin.syncedHeight,
    coinStatus: ormAddedCoin.coinStatus as CoinStatus,
    assetId: ormAddedCoin.assetId,
  };
}

function toSpentCoinRow(ormSpentCoin: {
  addressId: string;
  coinId: Uint8Array | Buffer | string;
  parentCoinInfo: Uint8Array | Buffer | string;
  puzzleHash: Uint8Array | Buffer | string;
  amount: string | bigint;
  syncedHeight: number;
  coinStatus: string;
  assetId: string;
  puzzleReveal: string;
  solution: string;
  offset: number;
}): SpentCoinRow {
  return {
    addressId: ormSpentCoin.addressId,
    coinId: Buffer.from(ormSpentCoin.coinId instanceof Uint8Array ? Buffer.from(ormSpentCoin.coinId) : ormSpentCoin.coinId),
    parentCoinInfo: Buffer.from(ormSpentCoin.parentCoinInfo instanceof Uint8Array ? Buffer.from(ormSpentCoin.parentCoinInfo) : ormSpentCoin.parentCoinInfo),
    puzzleHash: Buffer.from(ormSpentCoin.puzzleHash instanceof Uint8Array ? Buffer.from(ormSpentCoin.puzzleHash) : ormSpentCoin.puzzleHash),
    amount: BigInt(ormSpentCoin.amount),
    syncedHeight: ormSpentCoin.syncedHeight,
    coinStatus: ormSpentCoin.coinStatus as CoinStatus,
    assetId: ormSpentCoin.assetId,
    puzzleReveal: ormSpentCoin.puzzleReveal,
    solution: ormSpentCoin.solution,
    offset: ormSpentCoin.offset,
  };
}

export class CoinRepository implements ICoinRepository {
  async getCoins(addressId: string): Promise<AddedCoinRow[]> {
    return this.getAddedCoins(addressId);
  }

  async upsertAddedCoin(addressId: string, coin: AddedCoinRow) {
    const ds = await getDataSource();
    const repo = ds.getRepository(AddedCoin);
    const existing = await repo.findOne({ where: { addressId, coinId: coin.coinId } });
    if (existing) {
      await repo.update({ addressId, coinId: coin.coinId }, {
        parentCoinInfo: coin.parentCoinInfo,
        puzzleHash: coin.puzzleHash,
        amount: coin.amount.toString(),
        syncedHeight: coin.syncedHeight,
        coinStatus: coin.coinStatus,
        assetId: coin.assetId || 'xch',
      });
    } else {
      const newCoin = repo.create({
        addressId,
        coinId: coin.coinId,
        parentCoinInfo: coin.parentCoinInfo,
        puzzleHash: coin.puzzleHash,
        amount: coin.amount.toString(),
        syncedHeight: coin.syncedHeight,
        coinStatus: coin.coinStatus,
        assetId: coin.assetId || 'xch',
      });
      await repo.save(newCoin);
    }
  }

  async getAllAddedCoins(): Promise<AddedCoinRow[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(AddedCoin);
    const coins = await repo.find();
    return coins.map(toAddedCoinRow);
  }

  async getAddedCoins(addressId: string): Promise<AddedCoinRow[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(AddedCoin);
    const coins = await repo.find({ where: { addressId } });
    return coins.map(toAddedCoinRow);
  }

  async getPendingAddedCoins(): Promise<AddedCoinRow[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(AddedCoin);
    const coins = await repo.find({ where: { coinStatus: CoinStatus.PENDING } });
    return coins.map(toAddedCoinRow);
  }

  async updateAddedCoinStatus(addressId: string, coinId: Buffer, coinStatus: CoinStatus, syncedHeight: number): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(AddedCoin);
    await repo.update({ addressId, coinId }, { coinStatus, syncedHeight });
  }

  async getBalancesByAsset(addressId: string): Promise<IAssetBalance[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(AddedCoin);
    const rows = await repo.find({ where: { addressId, coinStatus: CoinStatus.UNSPENT } });
    const assetMap: Record<string, bigint> = {};
    for (const row of rows) {
      assetMap[row.assetId] = (assetMap[row.assetId] || 0n) + BigInt(row.amount);
    }
    return Object.entries(assetMap).map(([assetId, balance]) => ({ assetId, balance }));
  }

  async getBalance(addressId: string, assetId: string): Promise<bigint> {
    const ds = await getDataSource();
    const repo = ds.getRepository(AddedCoin);
    const rows = await repo.find({ where: { addressId, assetId, coinStatus: CoinStatus.UNSPENT } });
    let sum = 0n;
    for (const row of rows) {
      sum += BigInt(row.amount);
    }
    return sum;
  }

  async addSpentCoin(addressId: string, spentCoin: SpentCoinRow) {
    const ds = await getDataSource();
    const repo = ds.getRepository(SpentCoin);
    const newSpent = repo.create({
      addressId,
      coinId: spentCoin.coinId,
      parentCoinInfo: spentCoin.parentCoinInfo,
      puzzleHash: spentCoin.puzzleHash,
      amount: spentCoin.amount.toString(),
      syncedHeight: spentCoin.syncedHeight,
      coinStatus: spentCoin.coinStatus,
      assetId: spentCoin.assetId || 'xch',
      puzzleReveal: spentCoin.puzzleReveal,
      solution: spentCoin.solution,
      offset: spentCoin.offset,
    });
    await repo.save(newSpent);
  }

  async getSpentCoins(addressId: string): Promise<SpentCoinRow[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(SpentCoin);
    const coins = await repo.find({ where: { addressId } });
    return coins.map(toSpentCoinRow);
  }
}

// Exported above with class/interface definitions

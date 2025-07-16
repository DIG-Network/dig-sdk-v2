

import { getDatabaseProvider } from '../DatabaseProvider';
import { CoinStatus } from './CoinStatus';
import { IAssetBalance } from '../../application/types/AssetBalance';

const prisma = getDatabaseProvider().getPrismaClient();

export interface AddedCoinRow {
  addressId: string;
  coinId: Buffer;
  parentCoinInfo: Buffer;
  puzzleHash: Buffer;
  amount: bigint;
  syncedHeight: number;
  status: CoinStatus;
  assetId: string;
}

export interface SpentCoinRow {
  addressId: string;
  coinId: Buffer;
  parentCoinInfo: Buffer;
  puzzleHash: Buffer;
  amount: bigint;
  syncedHeight: number;
  status: CoinStatus;
  assetId: string;
  puzzleReveal: string;
  solution: string;
  offset: number;
}

export interface ICoinRepository {
  upsertAddedCoin(addressId: string, coin: { coinId: Buffer; parentCoinInfo: Buffer; puzzleHash: Buffer; amount: bigint; syncedHeight: number; status: CoinStatus; assetId?: string }): Promise<void>;
  getAddedCoins(addressId: string): Promise<AddedCoinRow[]>;
  getAllAddedCoins(): Promise<AddedCoinRow[]>;
  getPendingAddedCoins(): Promise<AddedCoinRow[]>;
  updateAddedCoinStatus(addressId: string, coinId: Buffer, status: CoinStatus, syncedHeight: number): Promise<void>;
  getBalancesByAsset(addressId: string): Promise<IAssetBalance[]>;
  getBalance(addressId: string, assetId: string): Promise<bigint>;
  addSpentCoin(addressId: string, spentCoin: { coinId: Buffer; parentCoinInfo: Buffer; puzzleHash: Buffer; amount: bigint; syncedHeight: number; status: CoinStatus; assetId?: string; puzzleReveal: string; solution: string; offset: number }): Promise<void>;
  getSpentCoins(addressId: string): Promise<SpentCoinRow[]>;
  getCoins(addressId: string): Promise<AddedCoinRow[]>;
}

function toAddedCoinRow(prismaAddedCoin: {
  addressId: string;
  coinId: Uint8Array | Buffer | string;
  parentCoinInfo: Uint8Array | Buffer | string;
  puzzleHash: Uint8Array | Buffer | string;
  amount: string | bigint;
  syncedHeight: number;
  status: string;
  assetId: string;
}): AddedCoinRow {
  return {
    addressId: prismaAddedCoin.addressId,
    coinId: Buffer.from(prismaAddedCoin.coinId instanceof Uint8Array ? Buffer.from(prismaAddedCoin.coinId) : prismaAddedCoin.coinId),
    parentCoinInfo: Buffer.from(prismaAddedCoin.parentCoinInfo instanceof Uint8Array ? Buffer.from(prismaAddedCoin.parentCoinInfo) : prismaAddedCoin.parentCoinInfo),
    puzzleHash: Buffer.from(prismaAddedCoin.puzzleHash instanceof Uint8Array ? Buffer.from(prismaAddedCoin.puzzleHash) : prismaAddedCoin.puzzleHash),
    amount: BigInt(prismaAddedCoin.amount),
    syncedHeight: prismaAddedCoin.syncedHeight,
    status: prismaAddedCoin.status as CoinStatus,
    assetId: prismaAddedCoin.assetId,
  };
}

function toSpentCoinRow(prismaSpentCoin: {
  addressId: string;
  coinId: Uint8Array | Buffer | string;
  parentCoinInfo: Uint8Array | Buffer | string;
  puzzleHash: Uint8Array | Buffer | string;
  amount: string | bigint;
  syncedHeight: number;
  status: string;
  assetId: string;
  puzzleReveal: string;
  solution: string;
  offset: number;
}): SpentCoinRow {
  return {
    addressId: prismaSpentCoin.addressId,
    coinId: Buffer.from(prismaSpentCoin.coinId instanceof Uint8Array ? Buffer.from(prismaSpentCoin.coinId) : prismaSpentCoin.coinId),
    parentCoinInfo: Buffer.from(prismaSpentCoin.parentCoinInfo instanceof Uint8Array ? Buffer.from(prismaSpentCoin.parentCoinInfo) : prismaSpentCoin.parentCoinInfo),
    puzzleHash: Buffer.from(prismaSpentCoin.puzzleHash instanceof Uint8Array ? Buffer.from(prismaSpentCoin.puzzleHash) : prismaSpentCoin.puzzleHash),
    amount: BigInt(prismaSpentCoin.amount),
    syncedHeight: prismaSpentCoin.syncedHeight,
    status: prismaSpentCoin.status as CoinStatus,
    assetId: prismaSpentCoin.assetId,
    puzzleReveal: prismaSpentCoin.puzzleReveal,
    solution: prismaSpentCoin.solution,
    offset: prismaSpentCoin.offset,
  };
}

export class CoinRepository implements ICoinRepository {
  async getCoins(addressId: string): Promise<AddedCoinRow[]> {
    return this.getAddedCoins(addressId);
  }
  async upsertAddedCoin(addressId: string, coin: { coinId: Buffer, parentCoinInfo: Buffer, puzzleHash: Buffer, amount: bigint, syncedHeight: number, status: CoinStatus, assetId?: string }) {
    await prisma.addedCoin.upsert({
      where: { addressId_coinId: { addressId, coinId: coin.coinId } },
      update: {
        parentCoinInfo: coin.parentCoinInfo,
        puzzleHash: coin.puzzleHash,
        amount: coin.amount.toString(),
        syncedHeight: coin.syncedHeight,
        status: coin.status,
        assetId: coin.assetId || 'xch',
      },
      create: {
        addressId,
        coinId: coin.coinId,
        parentCoinInfo: coin.parentCoinInfo,
        puzzleHash: coin.puzzleHash,
        amount: coin.amount.toString(),
        syncedHeight: coin.syncedHeight,
        status: coin.status,
        assetId: coin.assetId || 'xch',
      },
    });
  }

  async getAllAddedCoins(): Promise<AddedCoinRow[]> {
    const coins = await prisma.addedCoin.findMany();
    return coins.map(toAddedCoinRow);
  }

  async getAddedCoins(addressId: string): Promise<AddedCoinRow[]> {
    const coins = await prisma.addedCoin.findMany({ where: { addressId } });
    return coins.map(toAddedCoinRow);
  }

  async getPendingAddedCoins(): Promise<AddedCoinRow[]> {
    const coins = await prisma.addedCoin.findMany({ where: { status: CoinStatus.PENDING } });
    return coins.map(toAddedCoinRow);
  }

  async updateAddedCoinStatus(addressId: string, coinId: Buffer, status: CoinStatus, syncedHeight: number): Promise<void> {
    await prisma.addedCoin.update({
      where: { addressId_coinId: { addressId, coinId } },
      data: { status, syncedHeight },
    });
  }

  async getBalancesByAsset(addressId: string): Promise<IAssetBalance[]> {
    const rows = await prisma.addedCoin.findMany({
      where: { addressId, status: CoinStatus.UNSPENT },
    });
    const assetMap: Record<string, bigint> = {};
    for (const row of rows) {
      assetMap[row.assetId] = (assetMap[row.assetId] || 0n) + BigInt(row.amount);
    }
    return Object.entries(assetMap).map(([assetId, balance]) => ({ assetId, balance }));
  }

  async getBalance(addressId: string, assetId: string): Promise<bigint> {
    const rows = await prisma.addedCoin.findMany({
      where: { addressId, assetId, status: CoinStatus.UNSPENT },
    });
    let sum = 0n;
    for (const row of rows) {
      sum += BigInt(row.amount);
    }
    return sum;
  }

  async addSpentCoin(addressId: string, spentCoin: { coinId: Buffer, parentCoinInfo: Buffer, puzzleHash: Buffer, amount: bigint, syncedHeight: number, status: CoinStatus, assetId?: string, puzzleReveal: string, solution: string, offset: number }) {
    await prisma.spentCoin.create({
      data: {
        addressId,
        coinId: spentCoin.coinId,
        parentCoinInfo: spentCoin.parentCoinInfo,
        puzzleHash: spentCoin.puzzleHash,
        amount: spentCoin.amount.toString(),
        syncedHeight: spentCoin.syncedHeight,
        status: spentCoin.status,
        assetId: spentCoin.assetId || 'xch',
        puzzleReveal: spentCoin.puzzleReveal,
        solution: spentCoin.solution,
        offset: spentCoin.offset,
      },
    });
  }

  async getSpentCoins(addressId: string): Promise<SpentCoinRow[]> {
    const coins = await prisma.spentCoin.findMany({ where: { addressId } });
    return coins.map(toSpentCoinRow);
  }
}

// Exported above with class/interface definitions

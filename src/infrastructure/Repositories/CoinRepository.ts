import { PrismaClient, Coin as PrismaCoin } from '@prisma/client';
import { CoinStatus } from './CoinStatus';
import { IAssetBalance } from '../../application/types/AssetBalance';

const prisma = new PrismaClient();

export interface CoinRow {
  walletId: string;
  coinId: Buffer;
  parentCoinInfo: Buffer;
  puzzleHash: Buffer;
  amount: bigint;
  syncedHeight: number;
  status: CoinStatus;
  assetId: string;
}

export interface ICoinRepository {
  upsertCoin(walletId: string, coin: { coinId: Buffer, parentCoinInfo: Buffer, puzzleHash: Buffer, amount: bigint, syncedHeight: number, status: CoinStatus, assetId?: string }): Promise<void>;
  getCoins(walletId: string): Promise<CoinRow[]>;
  getAllCoins(): Promise<CoinRow[]>;
  getPendingCoins(): Promise<CoinRow[]>;
  updateCoinStatus(walletId: string, coinId: Buffer, status: CoinStatus, syncedHeight: number): Promise<void>;
  getBalancesByAsset(walletId: string): Promise<IAssetBalance[]>;
  getBalance(walletId: string, assetId: string): Promise<bigint>;
}

function toCoinRow(prismaCoin: PrismaCoin): CoinRow {
  return {
    walletId: prismaCoin.walletId,
    coinId: Buffer.from(prismaCoin.coinId),
    parentCoinInfo: Buffer.from(prismaCoin.parentCoinInfo),
    puzzleHash: Buffer.from(prismaCoin.puzzleHash),
    amount: BigInt(prismaCoin.amount),
    syncedHeight: prismaCoin.syncedHeight,
    status: prismaCoin.status as CoinStatus,
    assetId: prismaCoin.assetId,
  };
}

export class CoinRepository implements ICoinRepository {
  async upsertCoin(walletId: string, coin: { coinId: Buffer, parentCoinInfo: Buffer, puzzleHash: Buffer, amount: bigint, syncedHeight: number, status: string, assetId?: string }) {
    await prisma.coin.upsert({
      where: { walletId_coinId: { walletId, coinId: coin.coinId } },
      update: {
        parentCoinInfo: coin.parentCoinInfo,
        puzzleHash: coin.puzzleHash,
        amount: coin.amount.toString(),
        syncedHeight: coin.syncedHeight,
        status: coin.status,
        assetId: coin.assetId || 'xch',
      },
      create: {
        walletId,
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

  async getAllCoins(): Promise<CoinRow[]> {
    const coins = await prisma.coin.findMany();
    return coins.map(toCoinRow);
  }

  async getCoins(walletId: string): Promise<CoinRow[]> {
    const coins = await prisma.coin.findMany({ where: { walletId } });
    return coins.map(toCoinRow);
  }

  async getPendingCoins(): Promise<CoinRow[]> {
    const coins = await prisma.coin.findMany({ where: { status: CoinStatus.PENDING } });
    return coins.map(toCoinRow);
  }

  async updateCoinStatus(walletId: string, coinId: Buffer, status: CoinStatus, syncedHeight: number): Promise<void> {
    await prisma.coin.update({
      where: { walletId_coinId: { walletId, coinId } },
      data: { status, syncedHeight },
    });
  }

  async getBalancesByAsset(walletId: string): Promise<IAssetBalance[]> {
    const rows = await prisma.coin.findMany({
      where: { walletId, status: CoinStatus.UNSPENT },
    });
    const assetMap: Record<string, bigint> = {};
    for (const row of rows) {
      assetMap[row.assetId] = (assetMap[row.assetId] || 0n) + BigInt(row.amount);
    }
    return Object.entries(assetMap).map(([assetId, balance]) => ({ assetId, balance }));
  }

  async getBalance(walletId: string, assetId: string): Promise<bigint> {
    const rows = await prisma.coin.findMany({
      where: { walletId, assetId, status: CoinStatus.UNSPENT },
    });
    let sum = 0n;
    for (const row of rows) {
      sum += BigInt(row.amount);
    }
    return sum;
  }
}

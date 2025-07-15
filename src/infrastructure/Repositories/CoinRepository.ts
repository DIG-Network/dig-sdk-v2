import { Coin as PrismaCoin } from '@prisma/client';
import { getDatabaseProvider } from '../DatabaseProvider';
import { CoinStatus } from './CoinStatus';
import { IAssetBalance } from '../../application/types/AssetBalance';

const prisma = getDatabaseProvider().getPrismaClient();

export interface CoinRow {
  addressId: string;
  coinId: Buffer;
  parentCoinInfo: Buffer;
  puzzleHash: Buffer;
  amount: bigint;
  syncedHeight: number;
  status: CoinStatus;
  assetId: string;
}

export interface ICoinRepository {
  upsertCoin(addressId: string, coin: { coinId: Buffer, parentCoinInfo: Buffer, puzzleHash: Buffer, amount: bigint, syncedHeight: number, status: CoinStatus, assetId?: string }): Promise<void>;
  getCoins(addressId: string): Promise<CoinRow[]>;
  getAllCoins(): Promise<CoinRow[]>;
  getPendingCoins(): Promise<CoinRow[]>;
  updateCoinStatus(addressId: string, coinId: Buffer, status: CoinStatus, syncedHeight: number): Promise<void>;
  getBalancesByAsset(addressId: string): Promise<IAssetBalance[]>;
  getBalance(addressId: string, assetId: string): Promise<bigint>;
}

function toCoinRow(prismaCoin: PrismaCoin): CoinRow {
  return {
    addressId: prismaCoin.addressId,
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
  async upsertCoin(addressId: string, coin: { coinId: Buffer, parentCoinInfo: Buffer, puzzleHash: Buffer, amount: bigint, syncedHeight: number, status: string, assetId?: string }) {
    await prisma.coin.upsert({
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

  async getAllCoins(): Promise<CoinRow[]> {
    const coins = await prisma.coin.findMany();
    return coins.map(toCoinRow);
  }

  async getCoins(addressId: string): Promise<CoinRow[]> {
    const coins = await prisma.coin.findMany({ where: { addressId } });
    return coins.map(toCoinRow);
  }

  async getPendingCoins(): Promise<CoinRow[]> {
    const coins = await prisma.coin.findMany({ where: { status: CoinStatus.PENDING } });
    return coins.map(toCoinRow);
  }

  async updateCoinStatus(addressId: string, coinId: Buffer, status: CoinStatus, syncedHeight: number): Promise<void> {
    await prisma.coin.update({
      where: { addressId_coinId: { addressId, coinId } },
      data: { status, syncedHeight },
    });
  }

  async getBalancesByAsset(addressId: string): Promise<IAssetBalance[]> {
    const rows = await prisma.coin.findMany({
      where: { addressId, status: CoinStatus.UNSPENT },
    });
    const assetMap: Record<string, bigint> = {};
    for (const row of rows) {
      assetMap[row.assetId] = (assetMap[row.assetId] || 0n) + BigInt(row.amount);
    }
    return Object.entries(assetMap).map(([assetId, balance]) => ({ assetId, balance }));
  }

  async getBalance(addressId: string, assetId: string): Promise<bigint> {
    const rows = await prisma.coin.findMany({
      where: { addressId, assetId, status: CoinStatus.UNSPENT },
    });
    let sum = 0n;
    for (const row of rows) {
      sum += BigInt(row.amount);
    }
    return sum;
  }
}

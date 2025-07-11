import { CoinRepository, ICoinRepository } from '../../../src/infrastructure/Repositories/CoinRepository';
import { CoinStatus } from '../../../src/infrastructure/Repositories/CoinStatus';

describe('CoinRepository', () => {
  let coinRepo: ICoinRepository;

  beforeEach(async () => {
    coinRepo = new CoinRepository();
    // Truncate Coin table for test isolation
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.coin.deleteMany();
  });

  afterEach(async () => {
    // Truncate Coin table for test isolation
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.coin.deleteMany();
  });

  it('should upsert and retrieve coins', async () => {
    const coin = {
      coinId: Buffer.from('aabbcc', 'hex'),
      parentCoinInfo: Buffer.from('ddeeff', 'hex'),
      puzzleHash: Buffer.from('112233', 'hex'),
      amount: BigInt(1000),
      syncedHeight: 10,
      status: CoinStatus.UNSPENT,
    };
    await coinRepo.upsertCoin('xch1234', coin);
    const coins = await coinRepo.getCoins('xch1234');
    expect(coins.some(c => c.coinId.equals(coin.coinId) && c.amount === 1000n && c.status === CoinStatus.UNSPENT)).toBe(true);
  });

  it('should update coin status', async () => {
    const coin = {
      coinId: Buffer.from('aabbcc', 'hex'),
      parentCoinInfo: Buffer.from('ddeeff', 'hex'),
      puzzleHash: Buffer.from('112233', 'hex'),
      amount: BigInt(1000),
      syncedHeight: 10,
      status: CoinStatus.PENDING,
    };
    await coinRepo.upsertCoin('xch1234', coin);
    await coinRepo.updateCoinStatus('xch1234', coin.coinId, CoinStatus.SPENT, 11);
    const coins = await coinRepo.getCoins('xch1234');
    expect(coins[0].status).toBe(CoinStatus.SPENT);
    expect(coins[0].syncedHeight).toBe(11);
  });

  it('should get pending coins', async () => {
    const coin1 = {
      coinId: Buffer.from('aabbcc', 'hex'),
      parentCoinInfo: Buffer.from('ddeeff', 'hex'),
      puzzleHash: Buffer.from('112233', 'hex'),
      amount: BigInt(1000),
      syncedHeight: 10,
      status: CoinStatus.PENDING,
    };
    const coin2 = {
      coinId: Buffer.from('bbccdd', 'hex'),
      parentCoinInfo: Buffer.from('eeff00', 'hex'),
      puzzleHash: Buffer.from('223344', 'hex'),
      amount: BigInt(2000),
      syncedHeight: 12,
      status: CoinStatus.UNSPENT,
    };
    await coinRepo.upsertCoin('xch1234', coin1);
    await coinRepo.upsertCoin('xch1234', coin2);
    const pending = await coinRepo.getPendingCoins();
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe(CoinStatus.PENDING);
    expect(pending[0].coinId.equals(coin1.coinId)).toBe(true);
  });

  it('should sum balances by assetId and retrieve assetId correctly', async () => {
    const coin1 = {
      coinId: Buffer.from('aabbcc01', 'hex'),
      parentCoinInfo: Buffer.from('ddeeff01', 'hex'),
      puzzleHash: Buffer.from('11223301', 'hex'),
      amount: BigInt(1000),
      syncedHeight: 10,
      status: CoinStatus.UNSPENT,
      assetId: 'xch',
    };
    const coin2 = {
      coinId: Buffer.from('aabbcc02', 'hex'),
      parentCoinInfo: Buffer.from('ddeeff02', 'hex'),
      puzzleHash: Buffer.from('11223302', 'hex'),
      amount: BigInt(2000),
      syncedHeight: 11,
      status: CoinStatus.UNSPENT,
      assetId: 'cat1',
    };
    const coin3 = {
      coinId: Buffer.from('aabbcc03', 'hex'),
      parentCoinInfo: Buffer.from('ddeeff03', 'hex'),
      puzzleHash: Buffer.from('11223303', 'hex'),
      amount: BigInt(3000),
      syncedHeight: 12,
      status: CoinStatus.UNSPENT,
      assetId: 'cat1',
    };
    await coinRepo.upsertCoin('wallet1', coin1);
    await coinRepo.upsertCoin('wallet1', coin2);
    await coinRepo.upsertCoin('wallet1', coin3);
    const coins = await coinRepo.getCoins('wallet1');
    expect(coins.length).toBe(3);
    expect(coins.find(c => c.assetId === 'xch')).toBeDefined();
    expect(coins.filter(c => c.assetId === 'cat1').length).toBe(2);
    const balances = await coinRepo.getBalancesByAsset('wallet1');
    expect(balances).toEqual(
      expect.arrayContaining([
        { assetId: 'xch', balance: 1000n },
        { assetId: 'cat1', balance: 5000n },
      ])
    );
    const cat1Balance = await coinRepo.getBalance('wallet1', 'cat1');
    expect(cat1Balance).toBe(5000n);
    const xchBalance = await coinRepo.getBalance('wallet1', 'xch');
    expect(xchBalance).toBe(1000n);
  });
});

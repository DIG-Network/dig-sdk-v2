import { CoinRepository, ICoinRepository } from '../../../src/infrastructure/Repositories/CoinRepository';
import { Coin } from '../../../src/infrastructure/entities/Coin';
import { Spend } from '../../../src/infrastructure/entities/Spend';
import { PendingCoin } from '../../../src/infrastructure/entities/PendingCoin';

describe('CoinRepository', () => {
  let coinRepo: ICoinRepository;

  beforeEach(async () => {
    coinRepo = new CoinRepository();
    // Truncate Coin, Spend, and PendingCoin tables for test isolation
    const { getDataSource } = require('../../../src/infrastructure/DatabaseProvider');
    const { Coin } = require('../../../src/infrastructure/entities/Coin');
    const { Spend } = require('../../../src/infrastructure/entities/Spend');
    const { PendingCoin } = require('../../../src/infrastructure/entities/PendingCoin');
    const ds = await getDataSource();
    await ds.getRepository(Coin).clear();
    await ds.getRepository(Spend).clear();
    await ds.getRepository(PendingCoin).clear();
  });

  afterEach(async () => {
    // Truncate AddedCoin and SpentCoin tables for test isolation
    const { getDataSource } = require('../../../src/infrastructure/DatabaseProvider');
    const { Coin } = require('../../../src/infrastructure/entities/Coin');
    const { Spend } = require('../../../src/infrastructure/entities/Spend');
    const ds = await getDataSource();
    await ds.getRepository(Coin).clear();
    await ds.getRepository(Spend).clear();
  });

  it('should upsert and retrieve coins', async () => {
    const coin: Coin = {
      coinId: 'aabbcc',
      parentCoinInfo: 'ddeeff',
      puzzleHash: '112233',
      amount: '1000',
    };
    await coinRepo.addCoin(coin);
    const found = await coinRepo.getCoin('aabbcc');
    expect(found).toBeDefined();
    expect(found!.amount.toString()).toBe('1000');
  });

  // No coin status to update in new schema

  it('should add and retrieve pending coins', async () => {
    const pending: PendingCoin = {
      coinId: 'aabbcc',
      expirey: new Date(Date.now() + 10000)
    } as PendingCoin;
    await coinRepo.addPendingCoin(pending);
    const found = await coinRepo.getPendingCoin('aabbcc');
    expect(found).toBeDefined();
    expect(found!.coinId).toBe('aabbcc');
  });

  // No assetId or balance logic in new schema
  it('should add and retrieve spends', async () => {
    const spend: Spend = {
      coinId: 'deadbeef',
      puzzleReveal: 'reveal',
      solution: 'solution'
    } as Spend;
    await coinRepo.addSpend(spend);
    const spends = await coinRepo.getAllSpends();
    const found = spends.find(s => s.coinId === 'deadbeef');
    expect(found).toBeDefined();
    expect(found!.coinId).toBe('deadbeef');
    expect(found!.puzzleReveal).toBe('reveal');
    expect(found!.solution).toBe('solution');
  });
});

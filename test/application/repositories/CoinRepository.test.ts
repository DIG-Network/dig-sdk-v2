import Database from 'better-sqlite3';
import { CoinRepository } from '../../../src/application/repositories/CoinRepository';
import { ICoinRepository } from '../../../src/application/repositories/Interfaces/ICoinRepository';
import { CoinStatus } from '../../../src/application/types/CoinStatus';

describe('CoinRepository', () => {
  const dbPath = ':memory:';
  let db: Database.Database;
  let coinRepo: ICoinRepository;

  beforeEach(() => {
    db = new Database(dbPath);
    coinRepo = new CoinRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should upsert and retrieve coins', () => {
    const coin = {
      coinId: Buffer.from('aabbcc', 'hex'),
      parentCoinInfo: Buffer.from('ddeeff', 'hex'),
      puzzleHash: Buffer.from('112233', 'hex'),
      amount: BigInt(1000),
      syncedHeight: 10,
      status: CoinStatus.UNSPENT,
    };
    coinRepo.upsertCoin('xch1234', coin);
    const coins = coinRepo.getCoins('xch1234');
    expect(coins.length).toBe(1);
    expect(Buffer.isBuffer(coins[0].coinId) || typeof coins[0].coinId === 'object').toBe(true);
    expect(coins[0].amount).toBe('1000'); // expect string, matches repo logic
    expect(coins[0].status).toBe(CoinStatus.UNSPENT);
  });

  it('should update coin status', () => {
    const coin = {
      coinId: Buffer.from('aabbcc', 'hex'),
      parentCoinInfo: Buffer.from('ddeeff', 'hex'),
      puzzleHash: Buffer.from('112233', 'hex'),
      amount: BigInt(1000),
      syncedHeight: 10,
      status: CoinStatus.PENDING,
    };
    coinRepo.upsertCoin('xch1234', coin);
    coinRepo.updateCoinStatus('xch1234', coin.coinId, CoinStatus.SPENT, 11);
    const coins = coinRepo.getCoins('xch1234');
    expect(coins[0].status).toBe('spent');
    expect(coins[0].syncedHeight).toBe(11);
  });

  it('should get pending coins', () => {
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
    coinRepo.upsertCoin('xch1234', coin1);
    coinRepo.upsertCoin('xch1234', coin2);
    const pending = coinRepo.getPendingCoins();
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe('pending');
    expect(pending[0].coinId.equals(coin1.coinId)).toBe(true);
  });
});

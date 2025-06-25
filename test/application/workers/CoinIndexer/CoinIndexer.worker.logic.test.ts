import Database from 'better-sqlite3';
import { api as coinIndexerApi } from '../../../../src/application/workers/CoinIndexer/CoinIndexer.worker.logic';
import { CoinIndexerEventNames, CoinStateUpdatedEvent, CoinIndexerEvents } from '../../../../src/application/workers/CoinIndexer/CoinIndexerEvents';

describe('CoinIndexer.worker.logic', () => {
  const dbPath = ':memory:';

  beforeEach(() => {
    coinIndexerApi.__reset();
    coinIndexerApi.start('Test', dbPath);
  });

  afterEach(() => {
    coinIndexerApi.__reset();
  });

  it('should add and retrieve wallets', () => {
    coinIndexerApi.addWallet('xch1234');
    const wallets = coinIndexerApi.getWallets() as any[];
    expect(wallets.length).toBe(1);
    expect(wallets[0].address).toBe('xch1234');
    expect(wallets[0].namespace).toBe('default');
  });

  it('should update wallet sync state', () => {
    coinIndexerApi.addWallet('xch1234');
    coinIndexerApi.updateWalletSync('xch1234', 42, 'abc');
    const wallets = coinIndexerApi.getWallets() as any[];
    expect(wallets[0].synced_to_height).toBe(42);
    expect(wallets[0].synced_to_hash).toBe('abc');
  });

  it('should upsert and retrieve coins', () => {
    coinIndexerApi.addWallet('xch1234');
    const coin = {
      coinId: Buffer.from('aabbcc', 'hex'),
      parent_coin_info: Buffer.from('ddeeff', 'hex'),
      puzzle_hash: Buffer.from('112233', 'hex'),
      amount: BigInt(1000),
      synced_height: 10,
      status: 'unspent',
    };
    coinIndexerApi.upsertCoin('xch1234', coin);
    const coins = coinIndexerApi.getCoins('xch1234') as any[];
    expect(coins.length).toBe(1);
    expect(Buffer.isBuffer(coins[0].coinId) || typeof coins[0].coinId === 'object').toBe(true);
    expect(coins[0].amount).toBe('1000');
    expect(coins[0].status).toBe('unspent');
  });

  it('should emit CoinStateUpdated event on upsertCoin', (done) => {
    coinIndexerApi.onCoinStateUpdated((event: CoinStateUpdatedEvent) => {
      expect(event.wallet_id).toBe('xch1234');
      expect(event.status).toBe('unspent');
      done();
    });
    coinIndexerApi.addWallet('xch1234');
    coinIndexerApi.upsertCoin('xch1234', {
      coinId: Buffer.from('aabbcc', 'hex'),
      parent_coin_info: Buffer.from('ddeeff', 'hex'),
      puzzle_hash: Buffer.from('112233', 'hex'),
      amount: BigInt(1000),
      synced_height: 10,
      status: 'unspent',
    });
  });
});

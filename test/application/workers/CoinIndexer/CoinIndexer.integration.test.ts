import { CoinIndexer } from '../../../../src/application/workers/CoinIndexer/CoinIndexer';
import { BlockChainType } from '../../../../src/application/types/BlockChain';
import Database from 'better-sqlite3';
import fs from 'fs';
import { CoinStatus } from '../../../../src/application/types/CoinStatus';
import { PeerType } from '@dignetwork/datalayer-driver';

// Use the same DB as TestBlockchainService
const serviceDbPath = 'testservice.sqlite';
const coinDbPath = 'test_coinindexer_integration.sqlite';

describe('CoinIndexer integration', () => {
  let coinIndexer: CoinIndexer;
  let servicedb: Database.Database;
  let db: Database.Database;
  beforeAll(() => {
    if (fs.existsSync(coinDbPath)) fs.unlinkSync(coinDbPath);
    if (fs.existsSync(serviceDbPath)) fs.unlinkSync(serviceDbPath);

    db = new Database(coinDbPath);
    servicedb = new Database(serviceDbPath);

    servicedb.exec(
      `CREATE TABLE IF NOT EXISTS coin (coin_id BLOB, parentCoinInfo BLOB, puzzleHash BLOB, amount TEXT, status TEXT, walletId TEXT, height INTEGER)`,
    );

    servicedb.exec(
      `CREATE TABLE IF NOT EXISTS wallet (
        address TEXT PRIMARY KEY,
        namespace TEXT DEFAULT 'default',
        synced_to_height INTEGER,
        synced_to_hash TEXT
      )`,
    );
  });

  beforeEach(async () => {
    coinIndexer = new CoinIndexer();
  });

  afterEach(async () => {
    await coinIndexer.stop();

    servicedb.exec('DELETE FROM coin');

    db.exec('DELETE FROM coin');
  });

  function insertWallet(
    walletId: string,
    synced_to_height: number = 0,
    synced_to_hash: string = '',
  ) {
    db.prepare(
      'INSERT INTO wallet (address, namespace, synced_to_height, synced_to_hash) VALUES (?, ?, ?, ?)',
    ).run(walletId, 'default', synced_to_height, synced_to_hash);
  }

  function insertCoin({
    coin_id,
    parentCoinInfo,
    puzzleHash,
    amount,
    status,
    walletId,
    height,
  }: any) {
    servicedb
      .prepare(
        'INSERT INTO coin (coin_id, parentCoinInfo, puzzleHash, amount, status, walletId, height) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(coin_id, parentCoinInfo, puzzleHash, amount.toString(), status, walletId, height);
  }

  it('should ingest unspent coins and mark spent coins correctly', async () => {
    // Start CoinIndexer
    await coinIndexer.start(BlockChainType.Test, coinDbPath, 24, 'ca.crt', 'ca.key', PeerType.Simulator);

    // Simulate blockchain coins
    const walletId = 'aabbcc';
    insertWallet(walletId, 0, '');
    const coin1 = Buffer.from('01', 'hex');
    const coin2 = Buffer.from('02', 'hex');
    insertCoin({
      coin_id: coin1,
      parentCoinInfo: Buffer.from('11', 'hex'),
      puzzleHash: coin1,
      amount: 100n,
      status: CoinStatus.UNSPENT,
      walletId,
      height: 1,
    });
    insertCoin({
      coin_id: coin2,
      parentCoinInfo: Buffer.from('33', 'hex'),
      puzzleHash: coin2,
      amount: 200n,
      status: CoinStatus.UNSPENT,
      walletId,
      height: 2,
    });

    // Wait for sync
    await new Promise((res) => setTimeout(res, 1200));

    const coins = db.prepare('SELECT * FROM coin WHERE walletId = ?').all(walletId);
    expect(coins.length).toBe(2);
    expect(coins.some((c: any) => Buffer.compare(c.coinId, coin1) === 0)).toBe(true);
    expect(coins.some((c: any) => Buffer.compare(c.coinId, coin2) === 0)).toBe(true);

    // Remove coin1 from blockchain (simulate spend)
    servicedb.prepare('DELETE FROM coin WHERE coin_id = ?').run(coin1);
    await new Promise((res) => setTimeout(res, 1200));

    // Now coin1 should be marked as spent in CoinIndexer DB
    const spent = db
      .prepare('SELECT * FROM coin WHERE walletId = ? AND status = ?')
      .all(walletId, CoinStatus.SPENT);
    expect(spent.length).toBe(1);
    expect(Buffer.compare((spent[0] as any).coinId, coin1)).toBe(0);
  }, 10000);
});

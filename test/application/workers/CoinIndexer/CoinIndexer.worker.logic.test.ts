import Database from 'better-sqlite3';
import { api as coinIndexerApi } from '../../../../src/application/workers/CoinIndexer/CoinIndexer.worker.logic';
import { BlockChainType } from '../../../../src/application/types/BlockChain';
import { existsSync, unlinkSync } from 'fs';
import { PeerType } from '@dignetwork/datalayer-driver';

const dbPath = 'test_coinindexer_worker_logic.sqlite';

describe('CoinIndexer.worker.logic api', () => {
  beforeAll(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  it('should create the database file after start', async () => {
    coinIndexerApi.__reset();
    if (existsSync(dbPath)) unlinkSync(dbPath);
    await coinIndexerApi.start(BlockChainType.Test, dbPath, 'ca.crt', 'ca.key', PeerType.Simulator);
    expect(existsSync(dbPath)).toBe(true);
    // Check table exists (should be named 'coin' not 'coins')
    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='coin'").get();
    expect(tables).toBeDefined();
    db.close();
    coinIndexerApi.stop();
  });

  it('should not start twice', async () => {
    coinIndexerApi.__reset();
    await coinIndexerApi.start(BlockChainType.Test, dbPath, 'ca.crt', 'ca.key', PeerType.Simulator);
    await coinIndexerApi.start(BlockChainType.Test, dbPath, 'ca.crt', 'ca.key', PeerType.Simulator); // should not throw
    coinIndexerApi.stop();
  });

  it('should stop and reset', async () => {
    coinIndexerApi.__reset();
    await coinIndexerApi.start(BlockChainType.Test, dbPath, 'ca.crt', 'ca.key', PeerType.Simulator);
    coinIndexerApi.stop();
    coinIndexerApi.__reset();
    // Should be able to start again
    await coinIndexerApi.start(BlockChainType.Test, dbPath, 'ca.crt', 'ca.key', PeerType.Simulator);
    coinIndexerApi.stop();
  });
});

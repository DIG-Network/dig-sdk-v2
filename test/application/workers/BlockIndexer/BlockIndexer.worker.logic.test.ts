import { api } from '../../../../src/application/workers/BlockIndexer/BlockIndexer.worker.logic';
import Database from 'better-sqlite3';
import { BlockChainType } from '../../../../src/application/types/BlockChain';
import fs from 'fs';

// Mock BlockchainService for unit tests
class MockBlockchainService {
  private blocks: any[] = [];
  constructor(blocks: any[] = []) {
    this.blocks = blocks;
  }
  async getCurrentBlockchainHeight() {
    return this.blocks.length;
  }
  async getBlockchainBlockByHeight(h: number) {
    return this.blocks[h - 1] || null;
  }
}

describe('BlockIndexer.worker.logic api', () => {
  const dbPath = 'test_blockindexer_worker_logic.sqlite';
  
  beforeAll(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });
  
  afterEach(() => {
    try { new Database(dbPath).close(); } catch {}
  });

  it('should create the database file after start', async () => {
    api.__reset();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    await api.start(BlockChainType.Test, dbPath);
    expect(fs.existsSync(dbPath)).toBe(true);
    // Check table exists
    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='blocks'").get();
    expect(tables).toBeDefined();
    db.close();
    api.stop();
  });

  it('should not start twice', async () => {
    api.__reset();
    await api.start(BlockChainType.Test, dbPath);
    await api.start(BlockChainType.Test, dbPath); // should not throw
    api.stop();
  });

  it('should stop and reset', async () => {
    api.__reset();
    await api.start(BlockChainType.Test, dbPath);
    api.stop();
    api.__reset();
    // Should be able to start again
    await api.start(BlockChainType.Test, dbPath);
    api.stop();
  });
});

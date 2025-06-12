import { api } from '../../../src/application/workers/BlockIndexer/BlockIndexer.worker.logic';
import Database from 'better-sqlite3';
import { BlockChainType } from '../../../src/application/types/BlockChain';

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
  afterEach(() => {
    try { new Database(dbPath).close(); } catch {}
  });

  it('should start and ingest blocks', async () => {
    api.__reset();
    // Patch blockchainService
    const blocks = [
      { hash: 'a'.repeat(64), blockHeight: 1 },
      { hash: 'b'.repeat(64), blockHeight: 2 },
    ];
    (api as any).blockchainService = new MockBlockchainService(blocks);
    await api.start(BlockChainType.Test, dbPath);
    const db = new Database(dbPath);
    const rows = db.prepare('SELECT * FROM blocks').all();
    expect(rows.length).toBe(2);
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

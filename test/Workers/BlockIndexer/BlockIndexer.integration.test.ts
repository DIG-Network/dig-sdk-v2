import { BlockIndexer } from '../../../src/application/workers/BlockIndexer/BlockIndexer';
import { BlockChainType } from '../../../src/application/types/BlockChain';
import Database from 'better-sqlite3';
import fs from 'fs';
import { Block } from '../../../src/application/types/Block';


describe('BlockIndexer integration', () => {
  const dbPath = 'testfile.sqlite';
  const serviceDbPath = 'testservice.sqlite';
  const servicedb = new Database(serviceDbPath);

  let blockIndexer: BlockIndexer;

  beforeAll(() => {

    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    servicedb.exec(`CREATE TABLE IF NOT EXISTS blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT, blockHeight INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    servicedb.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run('blockhash1', 1);
    servicedb.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run('blockhash2', 2);
  });

  beforeEach(async () => {
    blockIndexer = new BlockIndexer();
  });

  afterEach(async () => {
    await blockIndexer.stop();

    servicedb.exec('DELETE FROM blocks');
    
    const db = new Database(dbPath);
    db.exec('DELETE FROM blocks');
    db.close();
  });

  it('should populate the database after worker starts', async () => {
    let blockIngestedCalledCount = 0;
    blockIndexer.onBlockIngested((block: Block) => {
      blockIngestedCalledCount++;
      expect(block).toBeDefined();
    });
    await blockIndexer.start(BlockChainType.Test, dbPath);
    
    await new Promise(res => setTimeout(res, 1000));

    expect(blockIngestedCalledCount).toBe(2);
  });
});

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

    servicedb.exec(`CREATE TABLE IF NOT EXISTS blocks (hash BLOB, blockHeight INTEGER PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
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

  function insertBlocks(db: Database.Database, blocks: Array<{ hash: string, blockHeight: number }>) {
    for (const { hash, blockHeight } of blocks) {
      db.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run(Buffer.from(hash, 'hex'), blockHeight);
    }
  }

  function assertBlockIngested(blockIndexer: BlockIndexer, expectedCount: number) {
    let blockIngestedCalledCount = 0;
    blockIndexer.onBlockIngested((block: Block) => {
      blockIngestedCalledCount++;
      expect(block).toBeDefined();
      expect(typeof block.hash).toBe('string');
    });
    return async () => {
      await new Promise(res => setTimeout(res, 1000));
      expect(blockIngestedCalledCount).toBe(expectedCount);
    };
  }

  it('should populate the database after worker starts', async () => {
    insertBlocks(servicedb, [
      { hash: 'blockhash1', blockHeight: 1 },
      { hash: 'blockhash2', blockHeight: 2 },
    ]);
    const check = assertBlockIngested(blockIndexer, 2);
    await blockIndexer.start(BlockChainType.Test, dbPath);
    await check();
  });

  it('should ingest in the database after initial population when worker starts', async () => {
    insertBlocks(servicedb, [
      { hash: 'blockhash1', blockHeight: 1 },
      { hash: 'blockhash2', blockHeight: 2 },
    ]);
    let blockIngestedCalledCount = 0;
    blockIndexer.onBlockIngested((block: Block) => {
      blockIngestedCalledCount++;
      expect(block).toBeDefined();
      expect(typeof block.hash).toBe('string');
    });
    await blockIndexer.start(BlockChainType.Test, dbPath);
    await new Promise(res => setTimeout(res, 1000));
    expect(blockIngestedCalledCount).toBe(2);
    blockIngestedCalledCount = 0;
    insertBlocks(servicedb, [
      { hash: 'blockhash1', blockHeight: 3 },
      { hash: 'blockhash2', blockHeight: 4 },
    ]);
    await new Promise(res => setTimeout(res, 2100));
    expect(blockIngestedCalledCount).toBe(2);
  });

  it('should not allow duplicate blockHeight (primary key) in blocks', async () => {
    const db = new Database(dbPath);
    await blockIndexer.start(BlockChainType.Test, dbPath);

    db.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run(Buffer.from('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', 'hex'), 10);
    expect(() => {
      db.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run(Buffer.from('cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe', 'hex'), 10);
    }).toThrow();

    db.close();
  });
});

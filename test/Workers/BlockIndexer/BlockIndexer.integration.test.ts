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

  it('getLatestBlock returns the latest block, throws if none', async () => {
    // No blocks yet
    await blockIndexer.start(BlockChainType.Test, dbPath);
    await expect(blockIndexer.getLatestBlock()).rejects.toThrow('No blocks found');

    // Insert blocks and test
    insertBlocks(new Database(dbPath), [
      { hash: 'a1'.padEnd(64, 'a'), blockHeight: 1 },
      { hash: 'b2'.padEnd(64, 'b'), blockHeight: 2 },
      { hash: 'c3'.padEnd(64, 'c'), blockHeight: 3 },
    ]);
    const latest = await blockIndexer.getLatestBlock();
    expect(latest.blockHeight).toBe(3);
    expect(typeof latest.hash).toBe('string');
  });

  it('getBlockByHeight returns correct block, throws if not found', async () => {
    await blockIndexer.start(BlockChainType.Test, dbPath);
    // No blocks yet
    await expect(blockIndexer.getBlockByHeight(1)).rejects.toThrow('Block with height 1 not found');

    // Insert blocks
    insertBlocks(new Database(dbPath), [
      { hash: 'd4'.padEnd(64, 'd'), blockHeight: 4 },
      { hash: 'e5'.padEnd(64, 'e'), blockHeight: 5 },
    ]);
    const block4 = await blockIndexer.getBlockByHeight(4);
    expect(block4.blockHeight).toBe(4);
    expect(typeof block4.hash).toBe('string');
    const block5 = await blockIndexer.getBlockByHeight(5);
    expect(block5.blockHeight).toBe(5);
    expect(typeof block5.hash).toBe('string');
    // Non-existent
    await expect(blockIndexer.getBlockByHeight(999)).rejects.toThrow('Block with height 999 not found');
  });

  it('getLatestBlock throws if db is not initialized', async () => {
    await expect(blockIndexer.getLatestBlock()).rejects.toThrow('Database not initialized');
  });

  it('getBlockByHeight throws if db is not initialized', async () => {
    await expect(blockIndexer.getBlockByHeight(1)).rejects.toThrow('Database not initialized');
  });
});

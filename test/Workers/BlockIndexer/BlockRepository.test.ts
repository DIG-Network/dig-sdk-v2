import Database from 'better-sqlite3';
import { BlockRepository } from '../../../src/application/repositories/BlockRepository';
import { IBlockRepository } from '../../../src/application/repositories/IBlockRepository';
import { Block } from '../../../src/application/types/Block';

describe('BlockRepository', () => {
  let db: Database.Database;
  let repo: IBlockRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec('CREATE TABLE blocks (hash BLOB, blockHeight INTEGER PRIMARY KEY)');
    repo = new BlockRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('getLatestBlock returns the latest block, throws if none', async () => {
    await expect(repo.getLatestBlock()).rejects.toThrow('No blocks found');
    db.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run(
      Buffer.from('a1'.padEnd(64, 'a'), 'hex'),
      1,
    );
    db.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run(
      Buffer.from('b2'.padEnd(64, 'b'), 'hex'),
      2,
    );
    const latest = await repo.getLatestBlock();
    expect(latest.blockHeight).toBe(2);
    expect(typeof latest.hash).toBe('string');
  });

  it('getBlockByHeight returns correct block, throws if not found', async () => {
    await expect(repo.getBlockByHeight(1)).rejects.toThrow('Block with height 1 not found');
    db.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run(
      Buffer.from('d4'.padEnd(64, 'd'), 'hex'),
      4,
    );
    db.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run(
      Buffer.from('e5'.padEnd(64, 'e'), 'hex'),
      5,
    );
    const block4 = await repo.getBlockByHeight(4);
    expect(block4.blockHeight).toBe(4);
    expect(typeof block4.hash).toBe('string');
    const block5 = await repo.getBlockByHeight(5);
    expect(block5.blockHeight).toBe(5);
    expect(typeof block5.hash).toBe('string');
    await expect(repo.getBlockByHeight(999)).rejects.toThrow('Block with height 999 not found');
  });
});

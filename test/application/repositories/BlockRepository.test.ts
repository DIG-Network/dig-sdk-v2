import Database from 'better-sqlite3';
import { BLOCK_DB_FILE, BlockRepository } from '../../../src/application/repositories/BlockRepository';
import fs from 'fs';
import { IBlockRepository } from '../../../src/application/repositories/Interfaces/IBlockRepository';

describe('BlockRepository', () => {
  let db: Database.Database;
  let repo: IBlockRepository;

  beforeEach(() => {
    db = new Database(BLOCK_DB_FILE);
    db.prepare('DROP TABLE IF EXISTS blocks').run();
    repo = new BlockRepository();
  });

  afterEach(() => {
    db.close();
  });

  it('getLatestBlock returns the latest block, throws if none', async () => {
    repo = new BlockRepository();
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
    expect(typeof latest.hash).toBe('object');
    expect(latest.hash.toString('hex')).toBe('b2'.padEnd(64, 'b'));
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
    expect(typeof block4.hash).toBe('object');
    expect(block4.hash.toString('hex')).toBe('d4'.padEnd(64, 'd'));
    const block5 = await repo.getBlockByHeight(5);
    expect(block5.blockHeight).toBe(5);
    expect(typeof block5.hash).toBe('object');
    expect(block5.hash.toString('hex')).toBe('e5'.padEnd(64, 'e'));
    await expect(repo.getBlockByHeight(999)).rejects.toThrow('Block with height 999 not found');
  });

  it('should handle empty database gracefully', async () => {
    const repo = new BlockRepository();
    await expect(repo.getLatestBlock()).rejects.toThrow();
    await expect(repo.getBlockByHeight(1)).rejects.toThrow();
  });
});

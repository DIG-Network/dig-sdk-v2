import Database from 'better-sqlite3';
import { BlockRepository } from '../../../src/application/repositories/BlockRepository';
import { IBlockRepository } from '../../../src/application/repositories/IBlockRepository';
import { Block } from '../../../src/application/types/Block';
import fs from 'fs';

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

  it('should create the database file on disk after constructor', () => {
    const dbPath = 'test_blockrepository_createdb.sqlite';
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const Database = require('better-sqlite3');
    const { BlockRepository } = require('../../../src/application/repositories/BlockRepository');
    const db = new Database(dbPath);
    new BlockRepository(db);
    // Check file exists
    db.close();
    expect(fs.existsSync(dbPath)).toBe(true);
    // Check table exists
    const db2 = new Database(dbPath);
    const tables = db2.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='blocks'").get();
    expect(tables).toBeDefined();
    db2.close();
    fs.unlinkSync(dbPath);
  });
});

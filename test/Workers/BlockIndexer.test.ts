import { BlockIndexer, BlockIndexerNotInitialized } from '../../src/Workers/BlockIndexer';
import fs from 'fs';
import path from 'path';

describe('BlockIndexer', () => {
  const dbPath = path.join(__dirname, 'test_block_indexer.sqlite');
  let blockIndexer: BlockIndexer;

  beforeAll(async () => {
    blockIndexer = new BlockIndexer();
    await blockIndexer.initialize(dbPath);
  });

  afterAll(async () => {
    await blockIndexer.stop();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should not start before initialize', async () => {
    const bi = new BlockIndexer();
    await expect(bi.start()).rejects.toThrow(BlockIndexerNotInitialized);
  });

  it('should emit event and store hashes when a new block is ingested', async () => {
    const hashes: string[] = [];
    blockIndexer.subscribe((hash) => hashes.push(hash));
    await blockIndexer.start();
    // Wait for 2 intervals (32 seconds) to ensure at least 2 hashes are ingested
    await new Promise((res) => setTimeout(res, 34000));
    expect(hashes.length).toBeGreaterThanOrEqual(2);
    const allHashes = await blockIndexer.getAllHashes();
    expect(allHashes.length).toBeGreaterThanOrEqual(2);
    await blockIndexer.stop();
  }, 40000);

  it('should not re-initialize if already initialized', async () => {
    await blockIndexer.initialize(dbPath);
    // Should not throw or re-initialize
    await expect(blockIndexer.initialize(dbPath)).resolves.toBeUndefined();
  });

  it('should not start if already started', async () => {
    await blockIndexer.start();
    await expect(blockIndexer.start()).resolves.toBeUndefined();
    await blockIndexer.stop();
  });

  it('should not throw if stop is called when not started', async () => {
    await expect(blockIndexer.stop()).resolves.toBeUndefined();
  });

  it('should return empty array from getAllHashes if not initialized', async () => {
    const bi = new BlockIndexer();
    await expect(bi.getAllHashes()).resolves.toEqual([]);
  });

  it('should not throw if stop is called multiple times', async () => {
    await blockIndexer.start();
    await blockIndexer.stop();
    await expect(blockIndexer.stop()).resolves.toBeUndefined();
  });

  it('should not throw if start is called after stop', async () => {
    await blockIndexer.start();
    await blockIndexer.stop();
    await expect(blockIndexer.start()).resolves.toBeUndefined();
    await blockIndexer.stop();
  });
});

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
});

import { BlockChainType } from '../../../src/application/BlockChainType';
import { BlockIndexer, BlockIndexerNotInitialized } from '../../../src/application/workers/BlockIndexer/BlockIndexer';
import { Block } from '../../../src/application/workers/BlockIndexer/BlockIndexer.worker';
import fs from 'fs';
import path from 'path';

describe('BlockIndexer', () => {
  const dbPath = path.join(__dirname, 'test_block_indexer.sqlite');
  let blockIndexer: BlockIndexer;

  beforeAll(async () => {
    blockIndexer = new BlockIndexer();
    await blockIndexer.initialize(BlockChainType.Chia, dbPath);
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
    const blocks: Block[] = [];
    blockIndexer.subscribe((block) => blocks.push(block));
    await blockIndexer.start();
    // Wait for 2 intervals (3.2 seconds) to ensure at least 2 blocks are ingested
    await new Promise((res) => setTimeout(res, 4000));
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const allBlocks = await blockIndexer.getAllHashes();
    expect(allBlocks.length).toBeGreaterThanOrEqual(2);
    await blockIndexer.stop();
  }, 10000);

  it('should not re-initialize if already initialized', async () => {
    await blockIndexer.initialize(BlockChainType.Chia, dbPath);
    await expect(blockIndexer.initialize(BlockChainType.Chia, dbPath)).resolves.toBeUndefined();
  });

  it('should not start if already started', async () => {
    const bi = new BlockIndexer();
    await bi.initialize(BlockChainType.Chia, dbPath);
    await bi.start();
    await expect(bi.start()).resolves.toBeUndefined();
    await bi.stop();
  }, 10000);

  it('should not throw if stop is called when not started', async () => {
    const bi = new BlockIndexer();
    await bi.initialize(BlockChainType.Chia, dbPath);
    await expect(bi.stop()).resolves.toBeUndefined();
  }, 10000);

  it('should return empty array from getAllHashes if not initialized', async () => {
    const bi = new BlockIndexer();
    await expect(bi.getAllHashes()).resolves.toEqual([]);
  });

  it('should not throw if stop is called multiple times', async () => {
    const bi = new BlockIndexer();
    await bi.initialize(BlockChainType.Chia, dbPath);
    await bi.start();
    await bi.stop();
    await expect(bi.stop()).resolves.toBeUndefined();
  }, 10000);
});

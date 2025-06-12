import { Block } from '../../../src/application/types/Block';
import { BlockChainType } from '../../../src/application/types/BlockChain';
import { BlockIndexer } from '../../../src/application/workers/BlockIndexer/BlockIndexer';
import fs from 'fs';
import path from 'path';

describe('BlockIndexer', () => {
  const dbPath = path.join(__dirname, 'test_block_indexer.sqlite');
  let blockIndexer: BlockIndexer;

  beforeAll(async () => {
    blockIndexer = new BlockIndexer();
  });

  afterAll(async () => {
    await blockIndexer.stop();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should emit event and store hashes when a new block is ingested', async () => {
    const blocks: Block[] = [];
    blockIndexer.onBlockIngested((block) => blocks.push(block));
    await blockIndexer.start(BlockChainType.Chia, dbPath);
    // Wait for 2 intervals (3.2 seconds) to ensure at least 2 blocks are ingested
    await new Promise((res) => setTimeout(res, 4000));
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const block = await blockIndexer.getBlockByHeight(2);
    expect(block).not.toBeNull();
    await blockIndexer.stop();
  }, 10000);

  it('should not re-initialize if already initialized', async () => {
    await blockIndexer.start(BlockChainType.Chia, dbPath);
    await expect(blockIndexer.start(BlockChainType.Chia, dbPath)).resolves.toBeUndefined();
  });

  it('should not start if already started', async () => {
    const bi = new BlockIndexer();
    await bi.start(BlockChainType.Chia, dbPath);
    await expect(bi.start(BlockChainType.Chia, dbPath)).resolves.toBeUndefined();
    await bi.stop();
  }, 10000);

  it('should not throw if stop is called when not started', async () => {
    const bi = new BlockIndexer();
    await expect(bi.stop()).resolves.toBeUndefined();
  }, 10000);

  it('should not throw if stop is called multiple times', async () => {
    const bi = new BlockIndexer();
    await bi.start(BlockChainType.Chia, dbPath);
    await bi.stop();
    await expect(bi.stop()).resolves.toBeUndefined();
  }, 10000);
});

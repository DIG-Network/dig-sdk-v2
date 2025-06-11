import { HashchainUpdater } from '../../../src/Workers/HashchainUpdater/HashchainUpdater';
import { BlockIndexer } from '../../../src/Workers/BlockIndexer/BlockIndexer';
import { Block } from '../../../src/Workers/BlockIndexer/BlockIndexer.worker';
import fs from 'fs';
import path from 'path';

describe('HashchainUpdater', () => {
  const dbPath = path.join(__dirname, 'test_hashchain_updater.sqlite');
  let blockIndexer: BlockIndexer;
  let hashchainUpdater: HashchainUpdater;
  const publicKey = 'a'.repeat(64); // dummy hex string

  beforeAll(async () => {
    blockIndexer = new BlockIndexer();
    await blockIndexer.initialize(dbPath);
    hashchainUpdater = new HashchainUpdater(blockIndexer, dbPath);
  });

  afterAll(async () => {
    await blockIndexer.stop();
    await hashchainUpdater.dispose();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should initialize without error', async () => {
    await expect(hashchainUpdater.initialize(publicKey)).resolves.toBeUndefined();
  });

  it('should not re-initialize if already initialized', async () => {
    await hashchainUpdater.initialize(publicKey);
    await expect(hashchainUpdater.initialize(publicKey)).resolves.toBeUndefined();
  });

  it('should call recalculate without error after initialize', async () => {
    await hashchainUpdater.initialize(publicKey);
    // Simulate a block
    const block: Block = { hash: 'b'.repeat(64), blockHeight: 1 };
    await expect(hashchainUpdater.recalculate(block)).resolves.toBeUndefined();
  });

  it('should dispose without error', async () => {
    await hashchainUpdater.initialize(publicKey);
    await expect(hashchainUpdater.dispose()).resolves.toBeUndefined();
  });
});

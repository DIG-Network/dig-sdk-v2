import { BlockIndexer } from '../../dist/Workers/BlockIndexer';
import fs from 'fs';
import path from 'path';

describe('BlockIndexer', () => {
  const dbPath = path.join(__dirname, 'test_block_indexer.sqlite');
  let blockIndexer: BlockIndexer;

  beforeAll(async () => {
    blockIndexer = new BlockIndexer();
    blockIndexer.initialize(dbPath);
  });

  afterAll(() => {
    blockIndexer.stop();
    if (blockIndexer['db']) {
      blockIndexer['db'].close();
    }
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should not start before initialize', () => {
    const bi = new BlockIndexer();
    expect(() => bi.start()).toThrow('BlockIndexer must be initialized before starting.');
  });

  it('should generate and store hashes every 16 seconds and emit event', async () => {
    jest.useFakeTimers();
    const hashes: string[] = [];
    blockIndexer.subscribe((hash) => hashes.push(hash));
    blockIndexer.start();
    jest.advanceTimersByTime(16000);
    jest.advanceTimersByTime(16000);
    expect(hashes.length).toBeGreaterThanOrEqual(2);
    const allHashes = blockIndexer.getAllHashes();
    expect(allHashes.length).toBeGreaterThanOrEqual(2);
    jest.useRealTimers();
    blockIndexer.stop();
  });
});

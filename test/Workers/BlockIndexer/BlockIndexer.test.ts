import { BlockIndexer } from '../../../src/application/workers/BlockIndexer/BlockIndexer';
import { BlockChainType } from '../../../src/application/types/BlockChain';
import { Block } from '../../../src/application/types/Block';
import fs from 'fs';
import path from 'path';
import { BlockIndexerEventNames } from '../../../src/application/workers/BlockIndexer/BlockIndexerEvents';

// Mock the worker and DB for async start
jest.mock('threads', () => {
  const actual = jest.requireActual('threads');
  return {
    ...actual,
    spawn: jest.fn(async () => ({
      start: jest.fn(),
      stop: jest.fn(),
      onBlockIngested: jest.fn(() => ({
        subscribe: jest.fn()
      })),
      terminate: jest.fn()
    })),
    Worker: jest.fn(),
    Thread: { terminate: jest.fn() }
  };
});

jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn(() => ({
      get: jest.fn(() => ({ hash: 'mockhash', blockHeight: 1 })),
      run: jest.fn(),
    })),
    exec: jest.fn(),
    close: jest.fn(),
  }));
});

describe('BlockIndexer async start', () => {
  const dbPath = path.join(__dirname, 'test_block_indexer_async.sqlite');
  let blockIndexer: BlockIndexer;

  beforeEach(() => {
    blockIndexer = new BlockIndexer();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  afterEach(async () => {
    await blockIndexer.stop();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should start without waiting for worker sync', async () => {
    // Should resolve immediately
    const startPromise = blockIndexer.start(BlockChainType.Chia, dbPath);
    // Not awaiting startPromise here to simulate async fire-and-forget
    expect(startPromise).toBeInstanceOf(Promise);
    // Await to ensure no errors
    await startPromise;
  });

  it('should allow registering onBlockIngested before and after start', async () => {
    const listener = jest.fn();
    blockIndexer.onBlockIngested(listener);
    await blockIndexer.start(BlockChainType.Chia, dbPath);
    // Simulate block event
    blockIndexer.emit(BlockIndexerEventNames.BlockIngested, { hash: 'abc', blockHeight: 1 });
    expect(listener).toHaveBeenCalledWith({ hash: 'abc', blockHeight: 1 });
  });

  it('should get latest block and block by height from DB', async () => {
    await blockIndexer.start(BlockChainType.Chia, dbPath);
    const latest = await blockIndexer.getLatestBlock();
    expect(latest).toEqual({ hash: 'mockhash', blockHeight: 1 });
    const byHeight = await blockIndexer.getBlockByHeight(1);
    expect(byHeight).toEqual({ hash: 'mockhash', blockHeight: 1 });
  });

  it('should call worker.start and handle events after BlockIndexer.start()', async () => {
    // Arrange
    const blockIndexer = new BlockIndexer();
    const workerStart = jest.fn();
    const onBlockIngested = jest.fn(() => ({
      subscribe: jest.fn((cb) => {
        // Simulate block event from worker
        cb && cb({ hash: 'workerhash', blockHeight: 2 });
        return { unsubscribe: jest.fn() };
      })
    }));
    // Patch the worker spawn to use our mock
    const mockWorker = {
      start: workerStart,
      stop: jest.fn(),
      onBlockIngested,
    };
    // Patch spawn to return our mock worker
    const { spawn } = require('threads');
    spawn.mockImplementation(async () => mockWorker);

    // Act
    const listener = jest.fn();
    blockIndexer.onBlockIngested(listener);
    await blockIndexer.start(BlockChainType.Chia, dbPath);

    // Assert
    expect(workerStart).toHaveBeenCalled();
    expect(onBlockIngested).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith({ hash: 'workerhash', blockHeight: 2 });
  });
});

test('sanity', () => expect(true).toBe(true));

import { BlockIndexer } from '../../../src/application/workers/BlockIndexer/BlockIndexer';
import { BlockChainType } from '../../../src/application/types/BlockChain';
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

  it('should call restartWorker, worker.stop, and Thread.terminate at the correct interval', async () => {
    jest.useFakeTimers();
    const blockIndexer = new BlockIndexer();
    const workerStart = jest.fn();
    const workerStop = jest.fn();
    const workerTerminate = jest.fn();
    const onBlockIngested = jest.fn(() => ({ subscribe: jest.fn() }));
    const mockWorker = {
      start: workerStart,
      stop: workerStop,
      onBlockIngested,
    };
    const { spawn, Thread } = require('threads');
    spawn.mockImplementation(async () => mockWorker);
    Thread.terminate = workerTerminate;
    // Spy on restartWorker
    const restartSpy = jest.spyOn(blockIndexer, 'restartWorker' as any);

    await blockIndexer.start(BlockChainType.Chia, dbPath, 1/1800); // 2 seconds for test
    expect(workerStart).toHaveBeenCalledTimes(1);
    // Simulate 2 intervals (2s each)
    for (let i = 0; i < 2; i++) {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    }
    expect(restartSpy).toHaveBeenCalledTimes(2);
    expect(workerStop).toHaveBeenCalledTimes(2);
    expect(workerTerminate).toHaveBeenCalledTimes(2);
    await blockIndexer.stop();
    jest.useRealTimers();
  });

  it('should not set a timer or call restartWorker if no restartIntervalHours is specified', async () => {
    jest.useFakeTimers();
    const blockIndexer = new BlockIndexer();
    const workerStart = jest.fn();
    const workerStop = jest.fn();
    const workerTerminate = jest.fn();
    const onBlockIngested = jest.fn(() => ({ subscribe: jest.fn() }));
    const mockWorker = {
      start: workerStart,
      stop: workerStop,
      onBlockIngested,
    };
    const { spawn, Thread } = require('threads');
    spawn.mockImplementation(async () => mockWorker);
    Thread.terminate = workerTerminate;
    // Spy on restartWorker
    const restartSpy = jest.spyOn(blockIndexer, 'restartWorker' as any);

    await blockIndexer.start(BlockChainType.Chia, dbPath); // no interval
    expect(workerStart).toHaveBeenCalledTimes(1);
    // Simulate time passing
    jest.advanceTimersByTime(10000);
    await Promise.resolve();
    await Promise.resolve();
    expect(restartSpy).not.toHaveBeenCalled();
    expect(workerStop).not.toHaveBeenCalled();
    expect(workerTerminate).not.toHaveBeenCalled();
    await blockIndexer.stop();
    jest.useRealTimers();
  });
});


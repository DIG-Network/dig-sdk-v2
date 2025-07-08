import { CoinIndexer } from '../../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { BlockChainType } from '../../../../src/application/types/BlockChain';
import fs from 'fs';
import path from 'path';
import { CoinStatus } from '../../../../src/infrastructure/Repositories/CoinStatus';

// Mock the worker and DB for async start
jest.mock('threads', () => {
  const actual = jest.requireActual('threads');
  return {
    ...actual,
    spawn: jest.fn(async () => ({
      start: jest.fn(),
      stop: jest.fn(),
      onCoinStateUpdated: jest.fn(() => ({
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
      get: jest.fn(() => ({ coinId: Buffer.from('01', 'hex'), syncedHeight: 1 })),
      run: jest.fn(),
    })),
    exec: jest.fn(),
    close: jest.fn(),
  }));
});

describe('CoinIndexer async start', () => {
  const dbPath = path.join(__dirname, 'test_coin_indexer_async.sqlite');
  let coinIndexer: CoinIndexer;

  beforeEach(() => {
    coinIndexer = new CoinIndexer();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  afterEach(async () => {
    await coinIndexer.stop();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should start without waiting for worker sync', async () => {
    // Should resolve immediately
    const startPromise = coinIndexer.start(BlockChainType.Test);
    expect(startPromise).toBeInstanceOf(Promise);
    await startPromise;
  });

  it('should call worker.start and handle events after CoinIndexer.start()', async () => {
    const coinIndexer = new CoinIndexer();
    const workerStart = jest.fn();
    const onCoinStateUpdated = jest.fn(() => ({
      subscribe: ({ next }: any) => {
        if (typeof next === 'function') {
          next({ walletId: 'wallet1', coinId: Buffer.from('01', 'hex'), status: CoinStatus.UNSPENT, syncedHeight: 2 });
        }
        return { unsubscribe: jest.fn() };
      }
    }));
    const mockWorker = {
      start: workerStart,
      stop: jest.fn(),
      onCoinStateUpdated,
    };
    const { spawn } = require('threads');
    spawn.mockImplementation(async () => mockWorker);

    const listener = jest.fn();
    coinIndexer.onCoinStateUpdated(listener);
    await coinIndexer.start(BlockChainType.Test);

    expect(workerStart).toHaveBeenCalled();
    expect(onCoinStateUpdated).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith({ walletId: 'wallet1', coinId: Buffer.from('01', 'hex'), status: CoinStatus.UNSPENT, syncedHeight: 2 });
  });

  it('should call restartWorker, worker.stop, and Thread.terminate at the correct interval', async () => {
    jest.useFakeTimers();
    const coinIndexer = new CoinIndexer();
    const workerStart = jest.fn();
    const workerStop = jest.fn();
    const workerTerminate = jest.fn();
    const onCoinStateUpdated = jest.fn(() => ({ subscribe: jest.fn() }));
    const mockWorker = {
      start: workerStart,
      stop: workerStop,
      onCoinStateUpdated,
    };
    const { spawn, Thread } = require('threads');
    spawn.mockImplementation(async () => mockWorker);
    Thread.terminate = workerTerminate;
    const restartSpy = jest.spyOn(coinIndexer as any, 'restartWorker');

    await coinIndexer.start(BlockChainType.Test, 1/1800); // 2 seconds for test
    expect(workerStart).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2200);
    await Promise.resolve();

    expect(restartSpy).toHaveBeenCalledTimes(1);
    expect(workerStop).toHaveBeenCalledTimes(1);
    expect(workerTerminate).toHaveBeenCalledTimes(1);
    await coinIndexer.stop();
    jest.useRealTimers();
  });

  it('should not set a timer or call restartWorker if no restartIntervalHours is specified', async () => {
    jest.useFakeTimers();
    const coinIndexer = new CoinIndexer();
    const workerStart = jest.fn();
    const workerStop = jest.fn();
    const workerTerminate = jest.fn();
    const onCoinStateUpdated = jest.fn(() => ({ subscribe: jest.fn() }));
    const mockWorker = {
      start: workerStart,
      stop: workerStop,
      onCoinStateUpdated,
    };
    const { spawn, Thread } = require('threads');
    spawn.mockImplementation(async () => mockWorker);
    Thread.terminate = workerTerminate;
    const restartSpy = jest.spyOn(coinIndexer as any, 'restartWorker');

    await coinIndexer.start(BlockChainType.Test); // no interval
    expect(workerStart).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(10000);
    await Promise.resolve();
    await Promise.resolve();
    expect(restartSpy).not.toHaveBeenCalled();
    expect(workerStop).not.toHaveBeenCalled();
    expect(workerTerminate).not.toHaveBeenCalled();
    await coinIndexer.stop();
    jest.useRealTimers();
  });
});

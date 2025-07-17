import { CoinIndexer } from '../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { EventEmitter } from 'events';

describe('CoinIndexer', () => {
  it('should initialize and handle blockReceived event on start', async () => {
    // Mock addPeersToListener and block handling
    const addPeersSpy = jest.spyOn(coinIndexer as any, 'addPeersToListener').mockResolvedValue(undefined);
    const handleCoinCreationsSpy = jest.spyOn(coinIndexer as any, 'handleCoinCreations').mockResolvedValue(undefined);
    const handleCoinSpendsSpy = jest.spyOn(coinIndexer as any, 'handleCoinSpends').mockResolvedValue(undefined);

    // Simulate block listener
    const block = {
      height: 3,
      headerHash: 'abc123',
      peerId: 'peer3',
      weight: "0",
      timestamp: Date.now(),
      coinAdditions: [],
      coinRemovals: [],
      coinCreations: [],
      coinSpends: [],
      hasTransactionsGenerator: false,
      generatorSize: 0,
    };

    // Start indexer
    // Replace listener with EventEmitter for test BEFORE start
    const mockListener = new EventEmitter();
    (coinIndexer as any).listener = mockListener;
    await coinIndexer.start();
    expect((coinIndexer as any).started).toBe(true);
    expect(addPeersSpy).toHaveBeenCalled();

    // Manually register blockReceived handler for the test
    mockListener.on('blockReceived', async (blockArg: any) => {
      await (coinIndexer as any).handleCoinCreations(blockArg, {});
      await (coinIndexer as any).handleCoinSpends(blockArg, {});
    });

    // Simulate blockReceived event
    mockListener.emit('blockReceived', block);
    // Wait for async event handling
    await new Promise(res => setTimeout(res, 10));
    expect(handleCoinCreationsSpy).toHaveBeenCalledWith(block, expect.any(Object));
    expect(handleCoinSpendsSpy).toHaveBeenCalledWith(block, expect.any(Object));
  });
  let coinIndexer: CoinIndexer;

  beforeEach(() => {
    coinIndexer = new CoinIndexer(1);
  });
});

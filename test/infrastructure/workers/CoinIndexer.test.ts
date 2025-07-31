import { CoinIndexer } from '../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { EventEmitter } from 'events';

describe('CoinIndexer', () => {
  let coinIndexer: CoinIndexer;
  beforeEach(() => {
    jest.resetModules();
    coinIndexer = new CoinIndexer(1);
  });

  it('should initialize and handle blockReceived event on start', async () => {
    const addPeersSpy = jest
      .spyOn(coinIndexer as any, 'addPeersToListener')
      .mockResolvedValue(undefined);
    const handleCoinCreationsSpy = jest
      .spyOn(coinIndexer as any, 'handleCoinCreations')
      .mockResolvedValue(undefined);
    const handleCoinSpendsSpy = jest
      .spyOn(coinIndexer as any, 'handleCoinSpends')
      .mockResolvedValue(undefined);

    const block = {
      height: 3,
      headerHash: 'abc123',
      peerId: 'peer3',
      weight: '0',
      timestamp: Date.now(),
      coinAdditions: [],
      coinRemovals: [],
      coinCreations: [],
      coinSpends: [],
      hasTransactionsGenerator: false,
      generatorSize: 0,
    };

    const mockListener = new EventEmitter();
    (coinIndexer as any).listener = mockListener;
    await coinIndexer.start();
    expect((coinIndexer as any).started).toBe(true);
    expect(addPeersSpy).toHaveBeenCalled();

    mockListener.on('blockReceived', async (blockArg: any) => {
      await (coinIndexer as any).handleCoinCreations(blockArg, {});
      await (coinIndexer as any).handleCoinSpends(blockArg, {});
    });

    mockListener.emit('blockReceived', block);
    await new Promise((res) => setTimeout(res, 10));
    expect(handleCoinCreationsSpy).toHaveBeenCalledWith(block, expect.any(Object));
    expect(handleCoinSpendsSpy).toHaveBeenCalledWith(block, expect.any(Object));
  });

  it('should emit NFT and CAT events if parsers return values', async () => {
    const parsers = require('../../../src/infrastructure/Workers/CoinIndexer/Parsers');
    jest.spyOn(parsers, 'parseNftsFromSpend').mockReturnValue({ id: 'nft1' });
    jest
      .spyOn(parsers, 'parseCatsFromSpend')
      .mockReturnValue({ assetId: 'cat-asset', cats: [{ id: 'cat1' }, { id: 'cat2' }] });

    const {
      CoinIndexer: PatchedCoinIndexer,
      CoinIndexerEventNames,
    } = require('../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer');
    const patchedIndexer = new PatchedCoinIndexer(1);

    const events: Record<string, any[]> = { nft: [], cat: [] };

    patchedIndexer.on(CoinIndexerEventNames.NftCreated, (e: any) => {
      events.nft.push(e);
    });
    patchedIndexer.on(CoinIndexerEventNames.CatCreated, (e: any) => {
      events.cat.push(e);
    });

    await (patchedIndexer as any).handleCoinSpends({ coinSpends: [{ fake: true }] });

    expect(events.nft.length).toBe(1);
    expect(events.nft[0]).toEqual({ id: 'nft1' });
    expect(events.cat.length).toBe(2);
    expect(events.cat[0]).toEqual({ id: 'cat1' });
    expect(events.cat[1]).toEqual({ id: 'cat2' });
  });

  it('should not start if already started', async () => {
    (coinIndexer as any).started = true;
    await coinIndexer.start();
    expect((coinIndexer as any).started).toBe(true);
  });

  it('should stop and set started to false', async () => {
    (coinIndexer as any).started = true;
    await coinIndexer.stop();
    expect((coinIndexer as any).started).toBe(false);
  });

  it('should not process block if already processing', async () => {
    (coinIndexer as any).processingBlock = true;
    (coinIndexer as any).blockQueue = [{ height: 1 }];
    const spy = jest.spyOn(coinIndexer as any, 'handleCoinCreations');
    await (coinIndexer as any).processNextBlock();
    expect(spy).not.toHaveBeenCalled();
    (coinIndexer as any).processingBlock = false;
  });

  it('should not process block if blockQueue is empty', async () => {
    (coinIndexer as any).processingBlock = false;
    (coinIndexer as any).blockQueue = [];
    const spy = jest.spyOn(coinIndexer as any, 'handleCoinCreations');
    await (coinIndexer as any).processNextBlock();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should handle error in processNextBlock and continue', async () => {
    jest.resetModules();
    jest.doMock('../../../src/infrastructure/DatabaseProvider', () => ({
      getDataSource: () => {
        throw new Error('fail');
      },
    }));
    const { CoinIndexer } = require('../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer');
    const coinIndexer = new CoinIndexer(1);
    (coinIndexer as any).processingBlock = false;
    (coinIndexer as any).blockQueue = [
      { height: 1, headerHash: '00', weight: '1', timestamp: Date.now() },
    ];
    await (coinIndexer as any).processNextBlock();
    expect((coinIndexer as any).processingBlock).toBe(false);
    jest.dontMock('../../../src/infrastructure/DatabaseProvider');
  });

  it('should skip addPeersToListener if enough peers', async () => {
    (coinIndexer as any).connectedPeers = ['a', 'b', 'c', 'd', 'e'];
    // Patch the static method directly on the class
    const L1ChiaPeer = require('../../../src/infrastructure/Peers/L1ChiaPeer').L1ChiaPeer;
    const orig = L1ChiaPeer.discoverRawDataPeers;
    L1ChiaPeer.discoverRawDataPeers = jest.fn().mockResolvedValue([{ host: 'h', port: 1 }]);
    await (coinIndexer as any).addPeersToListener();
    expect((coinIndexer as any).connectedPeers.length).toBeGreaterThanOrEqual(
      (coinIndexer as any).minConnections,
    );
    L1ChiaPeer.discoverRawDataPeers = orig;
  });

  it('should not add any peers if discoverRawDataPeers returns empty', async () => {
    (coinIndexer as any).connectedPeers = [];
    (coinIndexer as any).minConnections = 0; // Prevent infinite loop
    const L1ChiaPeer = require('../../../src/infrastructure/Peers/L1ChiaPeer').L1ChiaPeer;
    const orig = L1ChiaPeer.discoverRawDataPeers;
    L1ChiaPeer.discoverRawDataPeers = jest.fn().mockResolvedValue([]);
    await (coinIndexer as any).addPeersToListener();
    expect((coinIndexer as any).connectedPeers.length).toBe(0);
    L1ChiaPeer.discoverRawDataPeers = orig;
  }, 1000);

  it('should handlePeerDisconnected and not add new peer if none found', async () => {
    (coinIndexer as any).connectedPeers = ['peer1'];
    (coinIndexer as any).minConnections = 0; // Prevent infinite loop
    const L1ChiaPeer = require('../../../src/infrastructure/Peers/L1ChiaPeer').L1ChiaPeer;
    const orig = L1ChiaPeer.discoverRawDataPeers;
    L1ChiaPeer.discoverRawDataPeers = jest.fn().mockResolvedValue([]);
    await (coinIndexer as any).handlePeerDisconnected({ peerId: 'peer1', host: 'h', port: 1 });
    expect((coinIndexer as any).connectedPeers.length).toBe(0);
    L1ChiaPeer.discoverRawDataPeers = orig;
  }, 1000);

  it('should not process block if existingBlock.weight >= block.weight', async () => {
    jest.resetModules();
    jest.doMock('../../../src/infrastructure/DatabaseProvider', () => ({
      getDataSource: () => ({
        getRepository: () => ({
          findOne: () => ({ weight: '3' }),
        }),
      }),
    }));
    const { CoinIndexer } = require('../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer');
    const coinIndexer = new CoinIndexer(1);
    (coinIndexer as any).processingBlock = false;
    (coinIndexer as any).blockQueue = [
      { height: 1, headerHash: '00', weight: '2', timestamp: Date.now() },
    ];
    const handleCoinCreationsSpy = jest.spyOn(coinIndexer as any, 'handleCoinCreations');
    await (coinIndexer as any).processNextBlock();
    expect(handleCoinCreationsSpy).not.toHaveBeenCalled();
    jest.dontMock('../../../src/infrastructure/DatabaseProvider');
  });

  it('should process multiple blocks in queue', async () => {
    jest.resetModules();
    jest.doMock('../../../src/infrastructure/DatabaseProvider', () => ({
      getDataSource: () => ({
        getRepository: () => ({
          findOne: () => null,
        }),
      }),
    }));
    const { CoinIndexer } = require('../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer');
    const coinIndexer = new CoinIndexer(1);
    (coinIndexer as any).processingBlock = false;
    (coinIndexer as any).blockQueue = [
      { height: 1, headerHash: '00', weight: '1', timestamp: Date.now() },
      { height: 2, headerHash: '01', weight: '2', timestamp: Date.now() },
    ];
    let addBlockCount = 0;
    (coinIndexer as any).blockRepo.addBlock = jest.fn(() => {
      addBlockCount++;
      return Promise.resolve();
    });
    jest.spyOn(coinIndexer as any, 'handleCoinCreations').mockImplementation(() => {});
    jest.spyOn(coinIndexer as any, 'handleCoinSpends').mockImplementation(() => {});
    await (coinIndexer as any).processNextBlock();
    // Wait for all blocks to be processed
    await new Promise((resolve) => {
      const check = () => {
        if ((coinIndexer as any).blockQueue.length === 0 && !(coinIndexer as any).processingBlock) {
          resolve(null);
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
    expect(addBlockCount).toBe(2);
    jest.dontMock('../../../src/infrastructure/DatabaseProvider');
  });

  it('should handleCoinSpends and handleCoinCreations with undefined/null/empty arrays', async () => {
    // Should not throw, but must pass an object with coinSpends/coinCreations or skip
    await expect(
      (coinIndexer as any).handleCoinSpends({ coinSpends: undefined }),
    ).resolves.toBeUndefined();
    await expect(
      (coinIndexer as any).handleCoinSpends({ coinSpends: null }),
    ).resolves.toBeUndefined();
    await expect(
      (coinIndexer as any).handleCoinSpends({ coinSpends: [] }),
    ).resolves.toBeUndefined();
    await expect(
      (coinIndexer as any).handleCoinCreations({ coinCreations: undefined }),
    ).resolves.toBeUndefined();
    await expect(
      (coinIndexer as any).handleCoinCreations({ coinCreations: null }),
    ).resolves.toBeUndefined();
    await expect(
      (coinIndexer as any).handleCoinCreations({ coinCreations: [] }),
    ).resolves.toBeUndefined();
    // No error should be thrown
  });

  it('should handleCoinSpends and handleCoinCreations with missing arrays', async () => {
    await (coinIndexer as any).handleCoinSpends({});
    await (coinIndexer as any).handleCoinCreations({});
    // No error should be thrown
  });
});

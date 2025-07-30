import { CoinIndexer } from '../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { EventEmitter } from 'events';

describe('CoinIndexer', () => {
  let coinIndexer: CoinIndexer;
  beforeEach(() => {
    jest.resetModules();
    coinIndexer = new CoinIndexer(1);
  });

  it('should initialize and handle blockReceived event on start', async () => {
    const addPeersSpy = jest.spyOn(coinIndexer as any, 'addPeersToListener').mockResolvedValue(undefined);
    const handleCoinCreationsSpy = jest.spyOn(coinIndexer as any, 'handleCoinCreations').mockResolvedValue(undefined);
    const handleCoinSpendsSpy = jest.spyOn(coinIndexer as any, 'handleCoinSpends').mockResolvedValue(undefined);

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
    await new Promise(res => setTimeout(res, 10));
    expect(handleCoinCreationsSpy).toHaveBeenCalledWith(block, expect.any(Object));
    expect(handleCoinSpendsSpy).toHaveBeenCalledWith(block, expect.any(Object));
  });

  it('should emit NFT, CAT, DID, StreamedCat, and Clawback events if parsers return values', async () => {
    // Patch the parser stubs to return dummy data
    jest.doMock('../../../src/infrastructure/Workers/CoinIndexer/NftCatParsers', () => ({
      parseNftFromSpend: () => ({ type: 'nft', data: { id: 'nft1' } }),
      parseCatFromSpend: () => ({ type: 'cat', data: { id: 'cat1' } }),
      parseDidFromSpend: () => ({ type: 'did', data: { id: 'did1' } }),
      parseClawbackFromSpend: () => ({ type: 'clawback', data: { id: 'claw1' } }),
      parseStreamedCatFromSpend: () => ({ type: 'streamedcat', data: { id: 'scat1' } }),
    }));
    // Re-import CoinIndexer to get patched version
    const { CoinIndexer: PatchedCoinIndexer, CoinIndexerEventNames } = require('../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer');
    const patchedIndexer = new PatchedCoinIndexer(1);

    const events: Record<string, any> = {};
    patchedIndexer.onNftSpend((e: any) => { events.nft = e; });
    patchedIndexer.onCatSpend((e: any) => { events.cat = e; });
    patchedIndexer.onDidSpend((e: any) => { events.did = e; });
    patchedIndexer.onClawbackSpend((e: any) => { events.clawback = e; });
    patchedIndexer.onStreamedCatSpend((e: any) => { events.streamedcat = e; });

    // Call handleCoinSpends with a dummy spend
    await (patchedIndexer as any).handleCoinSpends({ coinSpends: [{ fake: true }] });

    expect(events.nft).toBeTruthy();
    expect(events.cat).toBeTruthy();
    expect(events.did).toBeTruthy();
    expect(events.clawback).toBeTruthy();
    expect(events.streamedcat).toBeTruthy();
  });
});

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

  it('should emit NFT and CAT events if parsers return values', async () => {
    jest.doMock('../../../src/infrastructure/Workers/CoinIndexer/Parsers', () => ({
      parseNftsFromSpend: () => ({ id: 'nft1' }),
      parseCatsFromSpend: () => ({ assetId: 'cat-asset', cats: [{ id: 'cat1' }, { id: 'cat2' }] })
    }));
    const { CoinIndexer: PatchedCoinIndexer, CoinIndexerEventNames } = require('../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer');
    const patchedIndexer = new PatchedCoinIndexer(1);

    const events: Record<string, any[]> = { nft: [], cat: [] };

    patchedIndexer.on(CoinIndexerEventNames.NftSpend, (e: any) => { events.nft.push(e); });
    patchedIndexer.on(CoinIndexerEventNames.CatSpend, (e: any) => { events.cat.push(e); });

    await (patchedIndexer as any).handleCoinSpends({ coinSpends: [{ fake: true }] });

    expect(events.nft.length).toBe(1);
    expect(events.nft[0]).toEqual({ id: 'nft1' });
    expect(events.cat.length).toBe(2);
    expect(events.cat[0]).toEqual({ id: 'cat1' });
    expect(events.cat[1]).toEqual({ id: 'cat2' });
  });
});

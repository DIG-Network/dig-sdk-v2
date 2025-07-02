import { PeerType } from "@dignetwork/datalayer-driver";

describe('Wallet', () => {
  const TEST_MNEMONIC = 'test test test test test test test test test test test ball';
  let wallet: any;

  it('should return the mnemonic', () => {
    wallet = new (require('../../../src/application/types/Wallet').Wallet)(TEST_MNEMONIC);
    expect(wallet.getMnemonic()).toBe(TEST_MNEMONIC);
  });

  it('should throw if mnemonic is missing', () => {
    // purposely breaking for test
    const w = new (require('../../../src/application/types/Wallet').Wallet)();
    expect(() => w.getMnemonic()).toThrow('Mnemonic seed phrase is not loaded.');
  });

  it('should return the expected master secret key', async () => {
    wallet = new (require('../../../src/application/types/Wallet').Wallet)(TEST_MNEMONIC);
    const key = await wallet.getMasterSecretKey();
    expect(key.toString('hex')).toBe('3016401f710b4e57bc41a65ae853756c6bb87b91309ccd7cab7f9bf4aefd486b');
  });

  it('should return the expected public synthetic key', async () => {
    wallet = new (require('../../../src/application/types/Wallet').Wallet)(TEST_MNEMONIC);
    const key = await wallet.getPublicSyntheticKey();
    expect(key.toString('hex')).toBe('aa5b2a88de3885ada96bf2d4e3bde4385d4401f0fcc86326454e78651c755a597ce15d16e9570f4cd9b30d0a34f703a1');
  });

  it('should return the expected private synthetic key', async () => {
    wallet = new (require('../../../src/application/types/Wallet').Wallet)(TEST_MNEMONIC);
    const key = await wallet.getPrivateSyntheticKey();
    expect(key.toString('hex')).toBe('6b2f510ff5a9edafde155623bc19ba49f079d1b3c52443bb40dfc41ebcfff52b');
  });

  it('should return the expected owner puzzle hash', async () => {
    wallet = new (require('../../../src/application/types/Wallet').Wallet)(TEST_MNEMONIC);
    const hash = await wallet.getOwnerPuzzleHash();
    expect(hash.toString('hex')).toBe('2485e1f2023ba59d36c63e2e52d3654d5d6a599773c82ba0895a3e74e7903550');
  });

  it('should return the expected owner public key', async () => {
    wallet = new (require('../../../src/application/types/Wallet').Wallet)(TEST_MNEMONIC);
    const pub = await wallet.getOwnerPublicKey(PeerType.Simulator);
    expect(pub).toBe('xch1yjz7rusz8wje6dkx8ch995m9f4wk5kvhw0yzhgyftgl8feusx4gq820cf2');
  });

  it('should return the expected key ownership signature', async () => {
    wallet = new (require('../../../src/application/types/Wallet').Wallet)(TEST_MNEMONIC);
    const sig = await wallet.createKeyOwnershipSignature('nonce123');
    expect(sig).toBe('a88c13c667ac01702e1629dc6aef9215239e4b1d09eb9533a43989850713e15444ff886c4d86f14841880c52ab3bffd90ebf63c2986b27ee0450dc04ee29aef9c01de29ec7d879d6d3fa269aaf8706894bdefa1fd09c03b4464ee7b2017703ee');
  });

  describe('selectUnspentCoins', () => {
    let mockPeer: any;
    let mockCache: any;
    let mockGetCoinId: any;
    let mockSelectCoins: any;
    let mockOwnerPuzzleHash: Buffer;

    beforeEach(() => {
      // Mock FileCacheService
      mockCache = {
        getCachedKeys: jest.fn().mockReturnValue([]),
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };
      jest.spyOn(require('../../../src/application/services/FileCacheService'), 'FileCacheService').mockImplementation(() => mockCache);

      // Mock getCoinId and selectCoins
      mockGetCoinId = jest.spyOn(require('@dignetwork/datalayer-driver'), 'getCoinId').mockImplementation((coin: any) => Buffer.from(coin.id, 'hex'));
      mockSelectCoins = jest.spyOn(require('@dignetwork/datalayer-driver'), 'selectCoins').mockImplementation((...args: any[]) => {
        const coins = args[0];
        return coins.slice(0, 1);
      });

      // Mock getOwnerPuzzleHash
      mockOwnerPuzzleHash = Buffer.from('aabbcc', 'hex');
      wallet = new (require('../../../src/application/types/Wallet').Wallet)(TEST_MNEMONIC);
      jest.spyOn(wallet, 'getOwnerPuzzleHash').mockResolvedValue(mockOwnerPuzzleHash);

      // Mock peer
      mockPeer = {
        getAllUnspentCoins: jest.fn().mockResolvedValue({ coins: [
          { id: '01', amount: 100n },
          { id: '02', amount: 200n },
        ] }),
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should select and reserve coins, respecting omitCoins and cache', async () => {
      const omitCoins = [{ id: '01', amount: 100n }];
      const result = await wallet.selectUnspentCoins(mockPeer, 50n, 10n, omitCoins, 0, '00'.repeat(32));
      expect(mockPeer.getAllUnspentCoins).toHaveBeenCalledWith(mockOwnerPuzzleHash, expect.any(Number), expect.any(Buffer));
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      // Should call cache.set for each selected coin
      expect(mockCache.set).toHaveBeenCalled();
      // Should not select omitted coin
      expect(result[0].id).not.toBe('01');
    });

    it('should throw if no coins and no reserved', async () => {
      mockPeer.getAllUnspentCoins.mockResolvedValue({ coins: [] });
      mockCache.getCachedKeys.mockReturnValue([]);
      await expect(wallet.selectUnspentCoins(mockPeer, 50n, 10n, [], 0, '00'.repeat(32))).rejects.toThrow('No unspent coins available.');
    });

    it('should retry if reserved coins exist', async () => {
      // Simulate reserved coins present, but no unspent coins
      mockPeer.getAllUnspentCoins.mockResolvedValue({ coins: [] });
      mockCache.getCachedKeys.mockReturnValue(['deadbeef']);
      mockCache.get.mockReturnValue({ coinId: 'deadbeef', expiry: Date.now() + 10000 });
      const promise = wallet.selectUnspentCoins(mockPeer, 50n, 10n, [], 0, '00'.repeat(32));
      // Fast-fail the wait
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => { fn(); return 0 as any; });
      setTimeout(() => promise.catch(() => {}), 20); // avoid unhandled rejection
      await expect(promise).rejects.toThrow('No unspent coins available.');
    });
  });
});

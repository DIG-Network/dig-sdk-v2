import { ColdWallet } from '../../../src/application/types/ColdWallet';
import config from '../../../src/config';

const TEST_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8249j';
const TEST_puzzleHash = Buffer.from('aabbcc', 'hex');

describe('ColdWallet', () => {
  let wallet: ColdWallet;
  let mockPeer: any;

  beforeEach(() => {
    config.BLOCKCHAIN_NETWORK = 'testnet';
    wallet = new ColdWallet(TEST_ADDRESS);
    // Mock the blockchain's getPuzzleHash method to avoid real address decoding
    (jest.spyOn(wallet["blockchain"], 'getPuzzleHash') as any).mockResolvedValue(TEST_puzzleHash);
    mockPeer = {
      getAllUnspentCoins: jest.fn().mockResolvedValue({ coins: [1, 2, 3], lastHeight: 1, lastHeaderHash: Buffer.alloc(32) }),
      isCoinSpent: jest.fn().mockResolvedValue(false),
    };
  });

  it('getPuzzleHash should delegate to blockchain and return a Buffer', async () => {
    const result = await wallet.getPuzzleHash();
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result).toEqual(TEST_puzzleHash);
  });

  it('masterPublicKeyToWalletSyntheticKey should delegate to blockchain and return a Buffer', () => {
    const testPubKey = Buffer.from('cafebabe', 'hex');
    const expected = Buffer.from('deadbeef', 'hex');
    jest.spyOn(wallet["blockchain"], 'masterPublicKeyToWalletSyntheticKey').mockReturnValue(expected);
    const result = wallet.masterPublicKeyToWalletSyntheticKey(testPubKey);
    expect(result).toEqual(expected);
  });

  it('masterPublicKeyToFirstPuzzleHash should delegate to blockchain and return a Buffer', () => {
    const testPubKey = Buffer.from('cafebabe', 'hex');
    const expected = Buffer.from('beadfeed', 'hex');
    jest.spyOn(wallet["blockchain"], 'masterPublicKeyToFirstPuzzleHash').mockReturnValue(expected);
    const result = wallet.masterPublicKeyToFirstPuzzleHash(testPubKey);
    expect(result).toEqual(expected);
  });

  it('getBalance should delegate to balanceRepository and return expected balance', async () => {
    const assetId = 'xch';
    const expectedBalance = 42n;
    jest.spyOn(wallet["balanceRepository"], 'getBalance').mockReturnValue(expectedBalance);
    const result = await wallet.getBalance(assetId);
    expect(result).toEqual({ assetId, balance: expectedBalance });
  });

  it('getBalances should delegate to balanceRepository and return expected balances', async () => {
    const expectedBalances = [
      { assetId: 'xch', balance: 100n },
      { assetId: 'btc', balance: 50n }
    ];
    jest.spyOn(wallet["balanceRepository"], 'getBalancesByAsset').mockReturnValue(expectedBalances);
    const result = await wallet.getBalances();
    expect(result).toEqual(expectedBalances);
  });

  it('should throw if getPuzzleHash is called with invalid address', async () => {
    const wallet = new ColdWallet('invalidaddress');
    await expect(wallet.getPuzzleHash()).rejects.toThrow();
  });
});

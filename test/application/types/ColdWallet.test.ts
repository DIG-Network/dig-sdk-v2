import { ColdWallet } from '../../../src/application/types/ColdWallet';
import config from '../../../src/config';
import { BlockchainNetwork } from '../../../src/config/types/BlockchainNetwork';

const TEST_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8249j';
const TEST_puzzleHash = Buffer.from('aabbcc', 'hex');

describe('ColdWallet', () => {
  let wallet: ColdWallet;
  let mockPeer: any;

  beforeEach(() => {
    config.BLOCKCHAIN_NETWORK = BlockchainNetwork.TESTNET;
    wallet = new ColdWallet(TEST_ADDRESS);
    // Mock the static getPuzzleHash method to avoid real address decoding
    const { ChiaBlockchainService } = require('../../../src/infrastructure/BlockchainServices/ChiaBlockchainService');
    jest.spyOn(ChiaBlockchainService, 'getPuzzleHash').mockImplementation((...args: any[]) => {
      const address = args[0];
      if (address === 'invalidaddress') {
        return Promise.reject(new Error('Invalid address'));
      }
      return Promise.resolve(TEST_puzzleHash);
    });
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
    jest.spyOn(wallet["balanceRepository"], 'getBalance').mockReturnValue(Promise.resolve(expectedBalance));
    const result = await wallet.getBalance(assetId);
    expect(result).toEqual({ assetId, balance: expectedBalance });
  });

  it('should throw if getPuzzleHash is called with invalid address', async () => {
    const wallet = new ColdWallet('invalidaddress');
    await expect(wallet.getPuzzleHash()).rejects.toThrow();
  });
});

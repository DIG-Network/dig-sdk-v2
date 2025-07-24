import { ColdWallet } from '../../../src/application/types/ColdWallet';
import config from '../../../src/config';
import { BlockchainNetwork } from '../../../src/config/types/BlockchainNetwork';
import { ChiaBlockchainService } from '../../../src/infrastructure/BlockchainServices/ChiaBlockchainService';

const TEST_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8249j';
const TEST_puzzleHash = Buffer.from('aabbcc', 'hex');

describe('ColdWallet', () => {
  let wallet: ColdWallet;
  let mockPeer: any;

  beforeEach(() => {
    config.BLOCKCHAIN_NETWORK = BlockchainNetwork.TESTNET;
    wallet = new ColdWallet(TEST_ADDRESS);
    // Mock the static getPuzzleHash method to avoid real address decoding
    jest.spyOn(ChiaBlockchainService, 'getPuzzleHash').mockImplementation((...args: any[]) => {
      const address = args[0];
      if (address === 'invalidaddress') {
        throw new Error('Invalid address');
      }
      return TEST_puzzleHash;
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

  it('should throw if getPuzzleHash is called with invalid address', async () => {
    const wallet = new ColdWallet('invalidaddress');
    expect(() => wallet.getPuzzleHash()).toThrow('Invalid address');
  });
});

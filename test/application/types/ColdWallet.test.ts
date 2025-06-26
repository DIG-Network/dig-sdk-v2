import { ColdWallet } from '../../../src/application/types/ColdWallet';
import { TestBlockchainService } from '../../../src/infrastructure/BlockchainServices/TestBlockchainService';

const TEST_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8249j';
const TEST_puzzleHash = Buffer.from('aabbcc', 'hex');
const TEST_SIGNATURE = Buffer.from('deadbeef', 'hex');
const TEST_PUBLIC_KEY = Buffer.from('cafebabe', 'hex');
const TEST_MESSAGE = Buffer.from('test message', 'utf-8');
const TEST_COIN_ID = Buffer.from('1234', 'hex');

const blockchain = new TestBlockchainService();

describe('ColdWallet', () => {
  let wallet: ColdWallet;
  let mockPeer: any;

  beforeEach(() => {
    wallet = new ColdWallet(blockchain);
    mockPeer = {
      getAllUnspentCoins: jest.fn().mockResolvedValue({ coins: [1, 2, 3], lastHeight: 1, lastHeaderHash: Buffer.alloc(32) }),
      isCoinSpent: jest.fn().mockResolvedValue(false),
    };
  });

  it('getPuzzleHash should delegate to blockchain and return a Buffer', () => {
    const result = wallet.getPuzzleHash(TEST_ADDRESS);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('verifyKeySignature should delegate to blockchain and return true', () => {
    const result = wallet.verifyKeySignature(TEST_SIGNATURE, TEST_PUBLIC_KEY, TEST_MESSAGE);
    expect(result).toBe(true);
  });

  it('listUnspentCoins should delegate to blockchain and return coins', async () => {
    const result = await wallet.listUnspentCoins(mockPeer, TEST_puzzleHash, 0, Buffer.alloc(32));
    expect(result).toHaveProperty('coins');
  });

  it('isCoinSpendable should delegate to blockchain and return a boolean', async () => {
    const result = await wallet.isCoinSpendable(mockPeer, TEST_COIN_ID, 0, Buffer.alloc(32));
    expect(typeof result).toBe('boolean');
  });
});

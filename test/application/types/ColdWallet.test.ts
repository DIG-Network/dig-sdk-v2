import { ColdWallet } from '../../../src/application/types/ColdWallet';

const TEST_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8249j';
const TEST_PUZZLE_HASH = Buffer.from('aabbcc', 'hex');
const TEST_SIGNATURE = Buffer.from('deadbeef', 'hex');
const TEST_PUBLIC_KEY = Buffer.from('cafebabe', 'hex');
const TEST_MESSAGE = Buffer.from('test message', 'utf-8');
const TEST_COIN_ID = Buffer.from('1234', 'hex');

jest.mock('@dignetwork/datalayer-driver', () => ({
  addressToPuzzleHash: jest.fn(() => TEST_PUZZLE_HASH),
  verifySignedMessage: jest.fn(() => true),
  Peer: jest.fn(),
}));

describe('ColdWallet', () => {
  let wallet: ColdWallet;
  let mockPeer: any;

  beforeEach(() => {
    wallet = new ColdWallet();
    mockPeer = {
      getAllUnspentCoins: jest.fn().mockResolvedValue({ coins: [1, 2, 3], lastHeight: 1, lastHeaderHash: Buffer.alloc(32) }),
      isCoinSpent: jest.fn().mockResolvedValue(false),
    };
  });

  it('getPuzzleHash should call addressToPuzzleHash and return a Buffer', () => {
    const result = wallet.getPuzzleHash(TEST_ADDRESS);
    expect(result).toBe(TEST_PUZZLE_HASH);
  });

  it('verifyKeySignature should call verifySignedMessage and return true', () => {
    const result = wallet.verifyKeySignature(TEST_SIGNATURE, TEST_PUBLIC_KEY, TEST_MESSAGE);
    expect(result).toBe(true);
  });

  it('listUnspentCoins should call peer.getAllUnspentCoins and return coins', async () => {
    const result = await wallet.listUnspentCoins(mockPeer, TEST_PUZZLE_HASH, 0, Buffer.alloc(32));
    expect(mockPeer.getAllUnspentCoins).toHaveBeenCalledWith(TEST_PUZZLE_HASH, 0, Buffer.alloc(32));
    expect(result.coins).toEqual([1, 2, 3]);
  });

  it('isCoinSpendable should call peer.isCoinSpent and return the negation', async () => {
    mockPeer.isCoinSpent.mockResolvedValue(false);
    const result = await wallet.isCoinSpendable(mockPeer, TEST_COIN_ID, 0, Buffer.alloc(32));
    expect(mockPeer.isCoinSpent).toHaveBeenCalledWith(TEST_COIN_ID, 0, Buffer.alloc(32));
    expect(result).toBe(true);
    mockPeer.isCoinSpent.mockResolvedValue(true);
    const result2 = await wallet.isCoinSpendable(mockPeer, TEST_COIN_ID, 0, Buffer.alloc(32));
    expect(result2).toBe(false);
  });
});

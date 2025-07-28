import { ChiaWallet } from '../../../src/infrastructure/types/ChiaWallet';
import { CoinIndexer, CoinIndexerEventNames } from '../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { ChiaWalletEventNames } from '../../../src/infrastructure/types/ChiaWalletEvents';

describe('ChiaWallet', () => {
  const TEST_MNEMONIC = 'test test test test test test test test test test test ball';
  let coinIndexer: CoinIndexer;
  let wallet: ChiaWallet;

  beforeEach(() => {
    coinIndexer = new CoinIndexer(1);
    wallet = new ChiaWallet(TEST_MNEMONIC, coinIndexer);
  });

  it('should initialize with mnemonic and subscribe to events', () => {
    expect(wallet).toBeInstanceOf(ChiaWallet);
  });

  it('should emit CoinCreated when matching puzzleHash', (done) => {
    const coin: CoinRecord = {
      parentCoinInfo: 'aabbcc',
      puzzleHash: wallet['chiaPuzzleHash']?.toString('hex') || '',
      amount: '123',
    };
    wallet.on(ChiaWalletEventNames.CoinCreated, (c) => {
      expect(c).toEqual(coin);
      done();
    });
    coinIndexer.emit(CoinIndexerEventNames.CoinCreated, coin);
  });

  it('should emit SpendCreated when matching puzzleHash', (done) => {
    const spend: CoinSpend = {
      coin: {
        parentCoinInfo: 'aabbcc',
        puzzleHash: wallet['chiaPuzzleHash']?.toString('hex') || '',
        amount: '123',
      },
      puzzleReveal: '',
      solution: '',
      offset: 0,
    };
    wallet.on(ChiaWalletEventNames.SpendCreated, (s) => {
      expect(s).toEqual(spend);
      done();
    });
    coinIndexer.emit(CoinIndexerEventNames.SpendCreated, spend);
  });
});

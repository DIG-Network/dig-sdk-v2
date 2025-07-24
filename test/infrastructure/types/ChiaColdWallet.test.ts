

import { ChiaColdWallet } from '../../../src/infrastructure/types/ChiaColdWallet';
import { CoinIndexer } from '../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { ChiaColdWalletEventNames } from '../../../src/infrastructure/types/ChiaWalletEvents';
import { ChiaBlockchainService } from '../../../src/infrastructure/BlockchainServices/ChiaBlockchainService';

describe('ChiaColdWallet', () => {
  const TEST_ADDRESS = 'txch1testaddress';
  let coinIndexer: CoinIndexer;
  let wallet: ChiaColdWallet;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(ChiaBlockchainService, 'getPuzzleHash').mockReturnValue(Buffer.from('aabbcc', 'hex'));
    coinIndexer = new CoinIndexer(1);
    wallet = new ChiaColdWallet(TEST_ADDRESS, coinIndexer);
  });

  it('should initialize with address and subscribe to events', () => {
    expect(wallet).toBeInstanceOf(ChiaColdWallet);
  });

  it('should emit CoinCreated when matching puzzleHash', (done) => {
    const coin: CoinRecord = {
      parentCoinInfo: 'aabbcc',
      puzzleHash: wallet['chiaPuzzleHash']?.toString('hex') || '',
      amount: '123',
    };
    wallet.on(ChiaColdWalletEventNames.CoinCreated, (c) => {
      expect(c).toEqual(coin);
      done();
    });
    coinIndexer.emit(require('../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer').CoinIndexerEventNames.CoinCreated, coin);
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
    wallet.on(ChiaColdWalletEventNames.SpendCreated, (s) => {
      expect(s).toEqual(spend);
      done();
    });
    coinIndexer.emit(require('../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer').CoinIndexerEventNames.SpendCreated, spend);
  });
});

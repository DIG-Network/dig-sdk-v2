import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { ColdWallet } from '../../application/types/ColdWallet';
import { CoinIndexer, CoinIndexerEventNames } from '../Workers/CoinIndexer/CoinIndexer';
import { ChiaColdWalletEventNames } from './ChiaWalletEvents';

export class ChiaColdWallet extends ColdWallet {
  private chiaPuzzleHash?: Buffer;

  /**
   * Construct from address (legacy) or from ColdWallet instance (preferred).
   */
  public constructor(addressOrWallet: string | ColdWallet, coinIndexer?: CoinIndexer);
  public constructor(addressOrWallet: string | ColdWallet, coinIndexer?: CoinIndexer) {
    if (typeof addressOrWallet === 'string') {
      super(addressOrWallet);
    } else {
      super(addressOrWallet.getAddress());
    }
    if (coinIndexer) {
      this.subscribeToChiaCoinIndexerEvents(coinIndexer);
    }
    this.chiaPuzzleHash = this.getPuzzleHash();
  }

  private async subscribeToChiaCoinIndexerEvents(coinIndexer: CoinIndexer) {
    coinIndexer.on(CoinIndexerEventNames.CoinCreated, (coin: CoinRecord) => {
      if (
        coin.puzzleHash &&
        this.chiaPuzzleHash &&
        coin.puzzleHash === this.chiaPuzzleHash.toString('hex')
      ) {
        this.emit(ChiaColdWalletEventNames.CoinCreated, coin);
      }
    });
    coinIndexer.on(CoinIndexerEventNames.SpendCreated, (spend: CoinSpend) => {
      if (
        spend.coin &&
        spend.coin.puzzleHash &&
        this.chiaPuzzleHash &&
        spend.coin.puzzleHash === this.chiaPuzzleHash.toString('hex')
      ) {
        this.emit(ChiaColdWalletEventNames.SpendCreated, spend);
      }
    });
  }
}

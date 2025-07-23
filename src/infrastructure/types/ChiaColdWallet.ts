import { ColdWallet } from '../../application/types/ColdWallet';
import { CoinIndexer, CoinIndexerEventNames } from '../Workers/CoinIndexer/CoinIndexer';
import { Coin } from '../entities/Coin';
import { Spend } from '../entities/Spend';
import { ChiaColdWalletEventNames } from './ChiaWalletEvents';

export class ChiaColdWallet extends ColdWallet {
  private chiaPuzzleHash?: Buffer;

  public constructor(address: string, coinIndexer?: CoinIndexer) {
    super(address);
    if (coinIndexer) {
      this.subscribeToChiaCoinIndexerEvents(coinIndexer);
    }
    this.chiaPuzzleHash = this.getPuzzleHash();
  }

  private async subscribeToChiaCoinIndexerEvents(coinIndexer: CoinIndexer) {
    coinIndexer.on(CoinIndexerEventNames.CoinCreated, (coin: Coin) => {
      if (coin.puzzleHash && this.chiaPuzzleHash && coin.puzzleHash.equals(this.chiaPuzzleHash)) {
        this.emit(ChiaColdWalletEventNames.CoinCreated, coin);
      }
    });
    coinIndexer.on(CoinIndexerEventNames.SpendCreated, (spend: Spend) => {
      if (spend.puzzleReveal && this.chiaPuzzleHash && spend.puzzleReveal.equals(this.chiaPuzzleHash)) {
        this.emit(ChiaColdWalletEventNames.SpendCreated, spend);
      }
    });
  }
}

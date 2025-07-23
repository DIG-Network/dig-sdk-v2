import { Wallet } from '../../application/types/Wallet';
import { CoinIndexer, CoinIndexerEventNames } from '../Workers/CoinIndexer/CoinIndexer';
import { Coin } from '../entities/Coin';
import { Spend } from '../entities/Spend';
import { ChiaWalletEventNames } from './ChiaWalletEvents';

export class ChiaWallet extends Wallet {
  private chiaPuzzleHash?: Buffer;

  public constructor(mnemonic: string, coinIndexer?: CoinIndexer) {
    super(mnemonic);
    if (coinIndexer) {
      this.subscribeToChiaCoinIndexerEvents(coinIndexer);
    }
    this.chiaPuzzleHash = this.getPuzzleHash();
  }

  private async subscribeToChiaCoinIndexerEvents(coinIndexer: CoinIndexer) {
    coinIndexer.on(CoinIndexerEventNames.CoinCreated, (coin: Coin) => {
      if (coin.puzzleHash && this.chiaPuzzleHash && coin.puzzleHash.equals(this.chiaPuzzleHash)) {
        this.emit(ChiaWalletEventNames.CoinCreated, coin);
      }
    });
    coinIndexer.on(CoinIndexerEventNames.SpendCreated, (spend: Spend) => {
      if (spend.puzzleReveal && this.chiaPuzzleHash && spend.puzzleReveal.equals(this.chiaPuzzleHash)) {
        this.emit(ChiaWalletEventNames.SpendCreated, spend);
      }
    });
  }
}

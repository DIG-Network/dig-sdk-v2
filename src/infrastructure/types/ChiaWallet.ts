import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { Wallet } from '../../application/types/Wallet';
import { CoinIndexer, CoinIndexerEventNames } from '../Workers/CoinIndexer/CoinIndexer';
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
    coinIndexer.on(CoinIndexerEventNames.CoinCreated, (coin: CoinRecord) => {
      if (
        coin.puzzleHash &&
        this.chiaPuzzleHash &&
        coin.puzzleHash === this.chiaPuzzleHash.toString('hex')
      ) {
        this.emit(ChiaWalletEventNames.CoinCreated, coin);
      }
    });
    coinIndexer.on(CoinIndexerEventNames.SpendCreated, (spend: CoinSpend) => {
      if (
        spend &&
        spend.coin &&
        spend.coin.puzzleHash &&
        this.chiaPuzzleHash &&
        spend.coin.puzzleHash === this.chiaPuzzleHash.toString('hex')
      ) {
        this.emit(ChiaWalletEventNames.SpendCreated, spend);
      }
    });
  }
}

import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { Wallet } from '../../application/types/Wallet';
import { CoinIndexer, CoinIndexerEventNames } from '../Workers/CoinIndexer/CoinIndexer';
import { ChiaWalletEventNames } from './ChiaWalletEvents';
import { Cat } from '../Workers/CoinIndexer/AssetCats';
import { Nft } from '../Workers/CoinIndexer/Nft';

export class ChiaWallet extends Wallet {
  private chiaPuzzleHash?: Buffer;

  /**
   * Construct from mnemonic or from Wallet instance (preferred).
   */
  public constructor(mnemonicOrWallet: string | Wallet, coinIndexer?: CoinIndexer) {
    if (typeof mnemonicOrWallet === 'string') {
      super(mnemonicOrWallet);
    } else {
      super(mnemonicOrWallet.getMnemonic());
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
    coinIndexer.on(CoinIndexerEventNames.CatCreated, (cat: Cat) => {
      if (
        cat.info &&
        cat.info.p2PuzzleHash &&
        this.chiaPuzzleHash &&
        cat.info.p2PuzzleHash === this.chiaPuzzleHash.toString('hex')
      ) {
        this.emit(ChiaWalletEventNames.CatCreated, cat);
      }
    });
    coinIndexer.on(CoinIndexerEventNames.NftCreated, (nft: Nft) => {
      if (
        nft.info &&
        nft.info.p2PuzzleHash &&
        this.chiaPuzzleHash &&
        nft.info.p2PuzzleHash === this.chiaPuzzleHash.toString('hex')
      ) {
        this.emit(ChiaWalletEventNames.NftCreated, nft);
      }
    });
  }
}

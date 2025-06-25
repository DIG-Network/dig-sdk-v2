import Database from 'better-sqlite3';
import { Observable } from 'observable-fns';
import { CoinStateUpdatedEvent } from './CoinIndexerEvents';
import { CoinRepository, CoinRow } from '../../repositories/CoinRepository';
import { WalletRepository, WalletRow } from '../../repositories/WalletRepository';
import { IBlockchainService } from '../../interfaces/IBlockChainService';
import { Peer, type Coin } from '@dignetwork/datalayer-driver';
import { BlockChainType } from '../../types/BlockChain';
import { TestBlockchainService } from '../../../infrastructure/BlockchainServices/TestBlockchainService';
import { ChiaBlockchainService } from '../../../infrastructure/BlockchainServices/ChiaBlockchainService';

let db: Database.Database | null = null;
let coinRepo: CoinRepository | null = null;
let walletRepo: WalletRepository | null = null;
let started = false;
let intervalId: NodeJS.Timeout | null = null;
let blockchainService: IBlockchainService | null = null;

let coinStateObservable: Observable<CoinStateUpdatedEvent> | null = null;
let coinStateObserver: ((event: CoinStateUpdatedEvent) => void) | null = null;

function mapUnspentCoinToDbFields(
  coin: Coin,
  wallet_id: string,
  blockchainService: IBlockchainService,
  synced_height: number,
): CoinRow {
  return {
    coinId: blockchainService.getCoinId(coin),
    parent_coin_info: coin.parentCoinInfo,
    puzzle_hash: coin.puzzleHash,
    amount: coin.amount,
    synced_height,
    status: 'unspent',
    wallet_id,
  };
}

async function sync() {
  if (!coinRepo || !walletRepo || !blockchainService) return;
  const wallets: WalletRow[] = walletRepo.getWallets();

  let peer: Peer | null = null; // TODO Update this by getting a value from PeerCluster from datalayer driver

  for (const wallet of wallets) {
    const unspent = await blockchainService.listUnspentCoins(
      peer!,
      Buffer.from(wallet.address, 'hex'),
      wallet.synced_to_height || 0,
      Buffer.alloc(32),
    );
    for (const coin of unspent.coins) {
      const mapped = mapUnspentCoinToDbFields(
        coin,
        wallet.address,
        blockchainService,
        wallet.synced_to_height || 0,
      );
      coinRepo.upsertCoin(wallet.address, mapped);
      if (coinStateObserver) {
        coinStateObserver({
          wallet_id: wallet.address,
          coinId: mapped.coinId,
          status: 'unspent',
          synced_height: wallet.synced_to_height || 0,
        });
      }
    }
  }
  // Check pending coins
  const pending: CoinRow[] = coinRepo.getPendingCoins();
  for (const coin of pending) {
    const spendable = await blockchainService.isCoinSpendable(
      peer!,
      coin.coinId,
      coin.synced_height,
      Buffer.alloc(32),
    );
    if (!spendable) {
      coinRepo.updateCoinStatus(coin.wallet_id, coin.coinId, 'spent', coin.synced_height);
      if (coinStateObserver) {
        coinStateObserver({
          wallet_id: coin.wallet_id,
          coinId: coin.coinId,
          status: 'spent',
          synced_height: coin.synced_height,
        });
      }
    }
  }
}

export const api = {
  async start(_blockchainType: BlockChainType, dbPath: string = './coin_indexer.sqlite') {
    if (started) return;
    db = new Database(dbPath);
    coinRepo = new CoinRepository(db);
    walletRepo = new WalletRepository(db);

    switch (_blockchainType) {
      case BlockChainType.Test:
        blockchainService = new TestBlockchainService();
        break;
      case BlockChainType.Chia:
      default:
        blockchainService = new ChiaBlockchainService();
        break;
    }

    started = true;
    intervalId = setInterval(sync, 1000);
  },
  stop() {
    started = false;
    if (intervalId) clearInterval(intervalId);
    db = null;
    coinRepo = null;
    walletRepo = null;
    blockchainService = null;
    coinStateObservable = null;
    coinStateObserver = null;
  },
  onCoinStateUpdated() {
    if (!coinStateObservable) {
      coinStateObservable = new Observable<CoinStateUpdatedEvent>((observer) => {
        coinStateObserver = (event: CoinStateUpdatedEvent) => {
          observer.next(event);
        };
        return () => {
          coinStateObserver = null;
        };
      });
    }
    return coinStateObservable;
  },
  __reset() {
    if (intervalId) clearInterval(intervalId);
    db = null;
    coinRepo = null;
    walletRepo = null;
    blockchainService = null;
    started = false;
    coinStateObservable = null;
    coinStateObserver = null;
  },
};

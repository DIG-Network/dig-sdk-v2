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
import { CoinStatus } from '../../types/CoinStatus';

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
  walletId: string,
  syncedHeight: number,
): CoinRow {
  return {
    coinId: blockchainService!.getCoinId(coin),
    parentCoinInfo: coin.parentCoinInfo,
    puzzleHash: coin.puzzleHash,
    amount: coin.amount,
    syncedHeight,
    status: CoinStatus.PENDING,
    walletId,
  };
}

async function sync() {
  if (!coinRepo || !walletRepo || !blockchainService) return;
  const wallets: WalletRow[] = walletRepo.getWallets();
  let peer: Peer | null = null; // TODO: get from PeerCluster if needed

  for (const wallet of wallets) {
    // Find all coins for this wallet that are pending
    const pendingCoins = coinRepo.getCoins(wallet.address).filter(c => c.status === CoinStatus.PENDING);
    // Determine the smallest syncedHeight among pending coins, or use wallet.synced_to_height
    let fetchFromHeight = wallet.synced_to_height || 0;

    if (pendingCoins.length > 0) {
      const minPendingHeight = Math.min(...pendingCoins.map(c => c.syncedHeight));
      fetchFromHeight = wallet.synced_to_height === undefined ? minPendingHeight : Math.min(fetchFromHeight, minPendingHeight);
    }
    // Fetch unspent coins from blockchain service
    const unspent = await blockchainService.listUnspentCoins(
      peer!,
      Buffer.from(wallet.address, 'hex'),
      fetchFromHeight,
      Buffer.alloc(32),
    );
    // Upsert all returned coins as unspent
    const seenCoinIds = new Set<string>();
    for (const coin of unspent.coins) {
      const mapped = mapUnspentCoinToDbFields(
        coin,
        wallet.address,
        fetchFromHeight,
      );
      coinRepo.upsertCoin(wallet.address, mapped);
      seenCoinIds.add(mapped.coinId.toString('hex'));
      if (coinStateObserver) {
        coinStateObserver({
          walletId: wallet.address,
          coinId: mapped.coinId,
          status: CoinStatus.UNSPENT,
          syncedHeight: fetchFromHeight,
        });
      }
    }
    // Mark as spent any pending coins not present in the response
    for (const coin of pendingCoins) {
      if (!seenCoinIds.has(coin.coinId.toString('hex'))) {
        coinRepo.updateCoinStatus(coin.walletId, coin.coinId, CoinStatus.SPENT, coin.syncedHeight);
        if (coinStateObserver) {
          coinStateObserver({
            walletId: coin.walletId,
            coinId: coin.coinId,
            status: CoinStatus.SPENT,
            syncedHeight: coin.syncedHeight,
          });
        }
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

    await sync();

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

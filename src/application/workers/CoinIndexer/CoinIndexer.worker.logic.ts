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
  synced_height: number,
): CoinRow {
  return {
    coinId: blockchainService!.getCoinId(coin),
    parent_coin_info: coin.parentCoinInfo,
    puzzle_hash: coin.puzzleHash,
    amount: coin.amount,
    synced_height,
    status: 'unspent',
    wallet_id,
  };
}

async function sync() {
  console.log('CoinIndexer sync method entered, coinRepo:', coinRepo, 'walletRepo:', walletRepo, 'blockchainService:', blockchainService);
  if (!coinRepo || !walletRepo || !blockchainService) return;
  const wallets: WalletRow[] = walletRepo.getWallets();
  let peer: Peer | null = null; // TODO: get from PeerCluster if needed

  console.log('wallets:', wallets.map(w => w.address));

  for (const wallet of wallets) {
    // Find all coins for this wallet that are pending
    console.log(`Syncing wallet: ${wallet.address}`);
    const pendingCoins = coinRepo.getCoins(wallet.address).filter(c => c.status === 'pending');
    // Determine the smallest synced_height among pending coins, or use wallet.synced_to_height
    let fetchFromHeight = wallet.synced_to_height || 0;

    if (pendingCoins.length > 0) {
      const minPendingHeight = Math.min(...pendingCoins.map(c => c.synced_height));
      fetchFromHeight = wallet.synced_to_height === undefined ? minPendingHeight : Math.min(fetchFromHeight, minPendingHeight);
    }
    console.log(`Fetching unspent coins for wallet ${wallet.address} from height ${fetchFromHeight}`);
    // Fetch unspent coins from blockchain service
    const unspent = await blockchainService.listUnspentCoins(
      peer!,
      Buffer.from(wallet.address, 'hex'),
      fetchFromHeight,
      Buffer.alloc(32),
    );
    // Upsert all returned coins as unspent
    const seenCoinIds = new Set<string>();
    console.log(`Received ${unspent.coins.length} unspent coins for wallet ${wallet.address}`);
    for (const coin of unspent.coins) {
      console.log(`Processing coin ${coin.puzzleHash.toString('hex')} for wallet ${wallet.address}`);
      const mapped = mapUnspentCoinToDbFields(
        coin,
        wallet.address,
        fetchFromHeight,
      );
      console.log(`Upserting coin ${mapped.coinId.toString('hex')} for wallet ${wallet.address}`);
      coinRepo.upsertCoin(wallet.address, mapped);
      seenCoinIds.add(mapped.coinId.toString('hex'));
      if (coinStateObserver) {
        coinStateObserver({
          wallet_id: wallet.address,
          coinId: mapped.coinId,
          status: 'unspent',
          synced_height: fetchFromHeight,
        });
      }
    }
    // Mark as spent any pending coins not present in the response
    for (const coin of pendingCoins) {
      if (!seenCoinIds.has(coin.coinId.toString('hex'))) {
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
}

export const api = {
  async start(_blockchainType: BlockChainType, dbPath: string = './coin_indexer.sqlite') {
    if (started) return;
    db = new Database(dbPath);
    coinRepo = new CoinRepository(db);
    walletRepo = new WalletRepository(db);

    console.log(`CoinIndexer starting with blockchain type: ${_blockchainType}`);

    switch (_blockchainType) {
      case BlockChainType.Test:
        blockchainService = new TestBlockchainService();
        break;
      case BlockChainType.Chia:
      default:
        blockchainService = new ChiaBlockchainService();
        break;
    }

    console.log(`CoinIndexer initialized with blockchain service: ${blockchainService.constructor.name}`);

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

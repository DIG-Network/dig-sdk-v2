import { Observable } from 'observable-fns';
import { CoinRepository, CoinRow } from '../../Repositories/CoinRepository';
import { PeerType, Tls, type Coin } from '@dignetwork/datalayer-driver';
import { TestBlockchainService } from '../../BlockchainServices/TestBlockchainService';
import { ChiaBlockchainService } from '../../BlockchainServices/ChiaBlockchainService';
import { IBlockchainService } from '../../BlockchainServices/IBlockChainService';
import { WalletRepository, AddressRow } from '../../../application/repositories/WalletRepository';
import { L1PeerService } from '../../Peers/L1PeerService';
import { BlockChainType } from '../../../application/types/BlockChain';
import { CoinStatus } from '../../../application/types/CoinStatus';
import { CoinStateUpdatedEvent } from './CoinIndexerEvents';
import { IL1ChiaPeer } from '../../Peers/L1ChiaPeer';


let coinRepo: CoinRepository | null = null;
let walletRepo: WalletRepository | null = null;
let started = false;
let intervalId: NodeJS.Timeout | null = null;
let blockchainService: IBlockchainService | null = null;

let coinStateObservable: Observable<CoinStateUpdatedEvent> | null = null;
let coinStateObserver: ((event: CoinStateUpdatedEvent) => void) | null = null;

const minSynchedHeight = 1; // Minimum height to consider for syncing, genesis block for now

function mapUnspentCoinToDbFields(coin: Coin, walletId: string, syncedHeight: number): CoinRow {
  return {
    coinId: blockchainService!.getCoinId(coin),
    parentCoinInfo: coin.parentCoinInfo,
    puzzleHash: coin.puzzleHash,
    amount: coin.amount,
    syncedHeight,
    status: CoinStatus.UNSPENT,
    assetId: 'xch', // TODO investigate how to tell what the asset type is
    walletId,
  };
}

async function sync() {
  if (!coinRepo || !walletRepo || !blockchainService) return;
  const wallets: AddressRow[] = walletRepo.getAddresses();

  for (const wallet of wallets) {
    // Find all coins for this wallet that are unspent or pending
    const dbCoins = coinRepo
      .getCoins(wallet.address)
      .filter((c) => c.status === CoinStatus.UNSPENT || c.status === CoinStatus.PENDING);

    let fetchFromHeight = minSynchedHeight;

    // Fetch unspent coins from blockchain service
    const unspent = await L1PeerService.withPeer(async (peer: IL1ChiaPeer) => {
      let fetchFromHash = await peer.getHeaderHashByHeight(fetchFromHeight);

      return await blockchainService!.listUnspentCoins(
        peer!,
        blockchainService!.getPuzzleHash(wallet.address),
        fetchFromHeight,
        fetchFromHash,
      );
    });

    if (unspent.coins.length === 0) {
      console.log(`No unspent coins found for wallet ${wallet.address} at height ${fetchFromHeight}`);
    }

    // Build a set of unspent coin IDs from the blockchain
    const unspentCoinIds = new Set(unspent.coins.map(coin => blockchainService!.getCoinId(coin).toString('hex')));

    // Mark coins as UNSPENT if present in unspent, otherwise as SPENT
    for (const dbCoin of dbCoins) {
      if (unspentCoinIds.has(dbCoin.coinId.toString('hex'))) {
        // Still unspent
        coinRepo.updateCoinStatus(wallet.address, dbCoin.coinId, CoinStatus.UNSPENT, fetchFromHeight);
        if (coinStateObserver) {
          coinStateObserver({
            walletId: wallet.address,
            coinId: dbCoin.coinId,
            status: CoinStatus.UNSPENT,
            syncedHeight: fetchFromHeight,
          });
        }
      } else {
        // Now spent
        coinRepo.updateCoinStatus(wallet.address, dbCoin.coinId, CoinStatus.SPENT, fetchFromHeight);
        if (coinStateObserver) {
          coinStateObserver({
            walletId: wallet.address,
            coinId: dbCoin.coinId,
            status: CoinStatus.SPENT,
            syncedHeight: fetchFromHeight,
          });
        }
      }
    }

    // Upsert all returned coins as unspent (in case there are new ones)
    for (const coin of unspent.coins) {
      const mapped = mapUnspentCoinToDbFields(coin, wallet.address, fetchFromHeight);
      coinRepo.upsertCoin(wallet.address, mapped);
    }
  }
}

export const api = {
  async start(
    _blockchainType: BlockChainType,
    crtPath: string = 'ca.crt',
    keyPath: string = 'ca.key',
    peerType?: PeerType,
  ) {
    if (started) return;
    coinRepo = new CoinRepository();
    walletRepo = new WalletRepository();

    switch (_blockchainType) {
      case BlockChainType.Test:
        blockchainService = new TestBlockchainService();
        break;
      case BlockChainType.Chia:
      default:
        blockchainService = new ChiaBlockchainService();
        break;
    }

    const tls = new Tls(crtPath, keyPath);
    await L1PeerService.connect(5, 10, peerType ?? PeerType.Mainnet, tls);

    await sync();

    started = true;
    intervalId = setInterval(sync, 1000);
  },
  stop() {
    started = false;
    if (intervalId) clearInterval(intervalId);
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
    coinRepo = null;
    walletRepo = null;
    blockchainService = null;
    started = false;
    coinStateObservable = null;
    coinStateObserver = null;
  },
};

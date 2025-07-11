import { Observable } from 'observable-fns';
import { CoinRepository, CoinRow } from '../../Repositories/CoinRepository';
import { PeerType, Tls, type Coin } from '@dignetwork/datalayer-driver';
import { ChiaBlockchainService } from '../../BlockchainServices/ChiaBlockchainService';
import { IBlockchainService } from '../../BlockchainServices/IBlockChainService';
import { AddressRepository, AddressRow, IAddressRepository } from '../../../application/repositories/AddressRepository';
import { L1PeerService } from '../../Peers/L1PeerService';
import { BlockChainType } from '../../../application/types/BlockChain';
import { CoinStatus } from '../../Repositories/CoinStatus';
import { CoinStateUpdatedEvent } from './CoinIndexerEvents';
import { IL1ChiaPeer } from '../../Peers/L1ChiaPeer';


let coinRepo: CoinRepository | null = null;
let addressRepo: IAddressRepository | null = null;
let started = false;
let intervalId: NodeJS.Timeout | null = null;
let blockchainService: IBlockchainService | null = null;

let coinStateObservable: Observable<CoinStateUpdatedEvent> | null = null;
let coinStateObserver: ((event: CoinStateUpdatedEvent) => void) | null = null;

const minSynchedHeight = 1; // Minimum height to consider for syncing, genesis block for now

function mapUnspentCoinToDbFields(coin: Coin, addressId: string, syncedHeight: number): CoinRow {
  return {
    coinId: blockchainService!.getCoinId(coin),
    parentCoinInfo: coin.parentCoinInfo,
    puzzleHash: coin.puzzleHash,
    amount: coin.amount,
    syncedHeight,
    status: CoinStatus.UNSPENT,
    assetId: 'xch', // TODO investigate how to tell what the asset type is
    addressId,
  };
}

async function sync() {
  if (!coinRepo || !addressRepo || !blockchainService) return;
  const addresses: AddressRow[] = await addressRepo.getAddresses();

  for (const address of addresses) {
    // Find all coins for this address that are unspent or pending
    const dbCoins = (await coinRepo
      .getCoins(address.address))
      .filter((c) => c.status === CoinStatus.UNSPENT || c.status === CoinStatus.PENDING);

    let fetchFromHeight = minSynchedHeight;

    // Fetch unspent coins from blockchain service
    const unspent = await L1PeerService.withPeer(async (peer: IL1ChiaPeer) => {
      let fetchFromHash = await peer.getHeaderHashByHeight(fetchFromHeight);

      return await blockchainService!.listUnspentCoins(
        peer!,
        blockchainService!.getPuzzleHash(address.address),
        fetchFromHeight,
        fetchFromHash,
      );
    });

    // Build a set of unspent coin IDs from the blockchain
    const unspentCoinIds = new Set(unspent.coins.map(coin => blockchainService!.getCoinId(coin).toString('hex')));

    // Mark coins as UNSPENT if present in unspent, otherwise as SPENT
    for (const dbCoin of dbCoins) {
      if (unspentCoinIds.has(dbCoin.coinId.toString('hex'))) {
        // Still unspent
        coinRepo.updateCoinStatus(address.address, dbCoin.coinId, CoinStatus.UNSPENT, fetchFromHeight);
        if (coinStateObserver) {
          coinStateObserver({
            addressId: address.address,
            coinId: dbCoin.coinId,
            status: CoinStatus.UNSPENT,
            syncedHeight: fetchFromHeight,
          });
        }
      } else {
        // Now spent
        coinRepo.updateCoinStatus(address.address, dbCoin.coinId, CoinStatus.SPENT, fetchFromHeight);
        if (coinStateObserver) {
          coinStateObserver({
            addressId: address.address,
            coinId: dbCoin.coinId,
            status: CoinStatus.SPENT,
            syncedHeight: fetchFromHeight,
          });
        }
      }
    }

    // Upsert all returned coins as unspent (in case there are new ones)
    for (const coin of unspent.coins) {
      const mapped = mapUnspentCoinToDbFields(coin, address.address, fetchFromHeight);
      coinRepo.upsertCoin(address.address, mapped);
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
    addressRepo = new AddressRepository();

    switch (_blockchainType) {
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
    addressRepo = null;
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
    addressRepo = null;
    blockchainService = null;
    started = false;
    coinStateObservable = null;
    coinStateObserver = null;
  },
};

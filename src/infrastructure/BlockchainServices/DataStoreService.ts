import { L1PeerService } from '../Peers/L1PeerService';
import { Coin, DataStore as DataStoreDriver } from '@dignetwork/datalayer-driver';
import { ChiaWallet } from '../types/ChiaWallet';
import { ChiaBlockchainService } from './ChiaBlockchainService';

export class DataStoreService {
  public static async create(wallet: ChiaWallet, coin: Coin): Promise<DataStoreDriver> {
    try {
      // Use L1PeerService.withPeer to get a peer
      return await L1PeerService.withPeer(async (peer) => {
        return await ChiaBlockchainService.mint(
          peer,
          wallet,
          coin,
          undefined,
          undefined,
          BigInt(0),
          undefined
        );
      });
    } catch (error) {
      console.error('Failed to mint Data Layer Store:', error);
      throw error;
    }
  }
}

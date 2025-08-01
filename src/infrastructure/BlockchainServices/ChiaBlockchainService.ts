import {
  writerDelegatedPuzzleFromKey,
  adminDelegatedPuzzleFromKey,
  oracleDelegatedPuzzle,
  mintStore,
  signCoinSpends,
  DataStore as DataStoreDriver,
  syntheticKeyToPuzzleHash,
} from '@dignetwork/datalayer-driver';

import { IBlockchainService } from './IBlockChainService';
import {
  masterSecretKeyToWalletSyntheticSecretKey,
  masterPublicKeyToWalletSyntheticKey,
  masterPublicKeyToFirstPuzzleHash,
  secretKeyToPublicKey,
  puzzleHashToAddress,
  signMessage,
  getCoinId,
  selectCoins,
  addressToPuzzleHash,
} from '@dignetwork/datalayer-driver';
import { Coin, Peer, PeerType, Tls, UnspentCoinsResponse } from '@dignetwork/datalayer-driver';
import { PrivateKey } from 'chia-bls';
import { IL1ChiaPeer, L1ChiaPeer } from '../Peers/L1ChiaPeer';
import config from '../../config';
import { BlockchainNetwork } from '../../config/types/BlockchainNetwork';
import { ChiaWallet } from '../types/ChiaWallet';

export class ChiaBlockchainService implements IBlockchainService {
  static async mint(
    peer: IL1ChiaPeer,
    wallet: ChiaWallet,
    storeCreationCoin: Coin,
    label?: string,
    description?: string,
    sizeInBytes?: bigint,
    authorizedWriterPublicSyntheticKey?: string,
    adminPublicSyntheticKey?: string,
  ): Promise<DataStoreDriver> {
    // Get public synthetic key from wallet
    const publicSyntheticKey = await wallet.getPublicSyntheticKey();
    const ownerSyntheicPuzzleHash = syntheticKeyToPuzzleHash(publicSyntheticKey);

    // Build delegation layers
    const delegationLayers = [];
    if (adminPublicSyntheticKey) {
      delegationLayers.push(
        adminDelegatedPuzzleFromKey(Buffer.from(adminPublicSyntheticKey, 'hex')),
      );
    }
    if (authorizedWriterPublicSyntheticKey) {
      delegationLayers.push(
        writerDelegatedPuzzleFromKey(Buffer.from(authorizedWriterPublicSyntheticKey, 'hex')),
      );
    }
    delegationLayers.push(oracleDelegatedPuzzle(ownerSyntheicPuzzleHash, BigInt(100000)));

    // Use zero root hash for now
    const rootHash = Buffer.from(
      '0000000000000000000000000000000000000000000000000000000000000000',
      'hex',
    );

    // Preflight for fee calculation (always provide 9 args, unroll array)
    await mintStore(
      publicSyntheticKey,
      [storeCreationCoin],
      rootHash,
      label || undefined,
      description || undefined,
      sizeInBytes || BigInt(0),
      ownerSyntheicPuzzleHash,
      delegationLayers,
      BigInt(0),
    );
    // Use the instance method for fee calculation
    const fee = await new ChiaBlockchainService().calculateFeeForCoinSpends();

    // Final mint (always provide 9 args, unroll array)
    const storeCreationResponse = await mintStore(
      publicSyntheticKey,
      [storeCreationCoin],
      rootHash,
      label || undefined,
      description || undefined,
      sizeInBytes || BigInt(0),
      ownerSyntheicPuzzleHash,
      delegationLayers,
      fee,
    );

    // Sign and broadcast
    const sig = signCoinSpends(
      storeCreationResponse.coinSpends,
      [await wallet.getPrivateSyntheticKey()],
      config.BLOCKCHAIN_NETWORK == BlockchainNetwork.TESTNET,
    );
    const err = await peer.broadcastSpend(storeCreationResponse.coinSpends, [sig]);
    if (err) {
      throw new Error(err);
    }
    // Wait for mempool propagation
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return storeCreationResponse.newStore;
  }
  masterSecretKeyFromSeed(seed: Buffer): Buffer {
    return Buffer.from(PrivateKey.fromSeed(seed).toHex(), 'hex');
  }

  secretKeyToPublicKey(secretKey: Buffer): Buffer {
    return secretKeyToPublicKey(secretKey);
  }

  masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer {
    return masterPublicKeyToWalletSyntheticKey(publicKey);
  }

  masterSecretKeyToWalletSyntheticSecretKey(secretKey: Buffer): Buffer {
    return masterSecretKeyToWalletSyntheticSecretKey(secretKey);
  }

  masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer {
    return masterPublicKeyToFirstPuzzleHash(publicKey);
  }

  static puzzleHashToAddress(puzzleHash: Buffer, prefix: string): string {
    return puzzleHashToAddress(puzzleHash, prefix);
  }

  getAddressPrefix(): string {
    return config.BLOCKCHAIN_NETWORK === BlockchainNetwork.MAINNET ? 'xch' : 'txch';
  }

  signMessage(message: Buffer, privateKey: Buffer): Buffer {
    return signMessage(message, privateKey);
  }

  static getCoinId(coin: Coin): Buffer {
    return getCoinId(coin);
  }

  selectCoins(coins: Coin[], amount: bigint): Coin[] {
    return selectCoins(coins, amount);
  }

  static getPuzzleHash(address: string): Buffer {
    return addressToPuzzleHash(address);
  }

  async listUnspentCoins(
    peer: IL1ChiaPeer,
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer,
  ): Promise<UnspentCoinsResponse> {
    return await peer.getAllUnspentCoins(puzzleHash, previousHeight, previousHeaderHash);
  }

  async isCoinSpendable(
    peer: IL1ChiaPeer,
    coinId: Buffer,
    lastHeight: number,
    headerHash: Buffer,
  ): Promise<boolean> {
    return !(await peer.isCoinSpent(coinId, lastHeight, headerHash));
  }

  async connectRandom(peerType: PeerType, tls: Tls): Promise<L1ChiaPeer> {
    const peer = await Peer.connectRandom(peerType, tls);
    if (!peer) throw new Error('Failed to connect to peer');
    return new L1ChiaPeer(peer);
  }

  public async calculateFeeForCoinSpends(): Promise<bigint> {
    return BigInt(1000000);
  }
}

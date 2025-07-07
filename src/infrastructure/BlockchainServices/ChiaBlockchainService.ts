import { IBlockchainService } from "./IBlockChainService";
import { Block } from "../../application/types/Block";
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
import { IL1ChiaPeer, L1ChiaPeer } from "../Peers/L1ChiaPeer";
import config from "../../config";

export class ChiaBlockchainService implements IBlockchainService {
  async getCurrentBlockchainHeight(): Promise<number> {
    return 0;
  }

  async getBlockchainBlockByHeight(height: number): Promise<Block> {
    return { hash: Buffer.from('abc', 'hex'), blockHeight: height };
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

  puzzleHashToAddress(puzzleHash: Buffer, prefix: string): string {
    return puzzleHashToAddress(puzzleHash, prefix);
  }

  getAddressPrefix(): string {
    return config.BLOCKCHAIN_NETWORK === 'mainnet' ? 'xch' : 'txch';
  }

  signMessage(message: Buffer, privateKey: Buffer): Buffer {
    return signMessage(message, privateKey);
  }

  getCoinId(coin: Coin): Buffer {
    return getCoinId(coin);
  }

  selectCoins(coins: Coin[], amount: bigint): Coin[] {
    return selectCoins(coins, amount);
  }

  getPuzzleHash(address: string): Buffer {
    return addressToPuzzleHash(address);
  }

  async listUnspentCoins(
    peer: IL1ChiaPeer,
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer
  ): Promise<UnspentCoinsResponse> {
    return await peer.getAllUnspentCoins(puzzleHash, previousHeight, previousHeaderHash);
  }
  
  async isCoinSpendable(
    peer: IL1ChiaPeer,
    coinId: Buffer,
    lastHeight: number,
    headerHash: Buffer
  ): Promise<boolean> {
    return !(await peer.isCoinSpent(coinId, lastHeight, headerHash));
  }

  async connectRandom(peerType: PeerType, tls: Tls): Promise<L1ChiaPeer> {
    const peer = await Peer.connectRandom(peerType, tls);
    if (!peer) throw new Error('Failed to connect to peer');
    return new L1ChiaPeer(peer);
  }
}
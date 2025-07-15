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
  sendXch,
  signCoinSpends,
} from '@dignetwork/datalayer-driver';
import { Coin, Peer, PeerType, Tls, UnspentCoinsResponse } from '@dignetwork/datalayer-driver';
import { PrivateKey } from 'chia-bls';
import { IL1ChiaPeer, L1ChiaPeer } from '../Peers/L1ChiaPeer';
import config from '../../config';
import { CoinRepository } from '../../infrastructure/Repositories/CoinRepository';
import { Wallet } from '../../application/types/Wallet';
import { L1PeerService } from '../Peers/L1PeerService';

export class ChiaBlockchainService implements IBlockchainService {
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

  async spendBalance(wallet: Wallet, amount: bigint, recipientAddress: string): Promise<void> {
    // Fetch unspent coins from repository
    const publicSyntheticKey = await wallet.getPublicSyntheticKey();
    const addressId = await wallet.getOwnerPublicKey();
    const coinRepo = new CoinRepository();
    const unspentCoins = (await coinRepo.getCoins(addressId)).filter((c) => c.status === 'unspent');

    const selectedCoins = selectCoins(unspentCoins, amount);
    let fee = await this.calculateFeeForCoinSpends();

    const recipientOutput = {
      puzzleHash: addressToPuzzleHash(recipientAddress),
      amount,
      memos: [],
    };

    const coinSpends = await sendXch(publicSyntheticKey, selectedCoins, [recipientOutput], fee);

    const privateSyntheticKey = await wallet.getPrivateSyntheticKey();
    const signature = signCoinSpends(coinSpends, [privateSyntheticKey], config.BLOCKCHAIN_NETWORK === 'testnet');

    await L1PeerService.withPeer(async (peer: IL1ChiaPeer) => {
      const err = await peer.broadcastSpend(coinSpends, [signature]);
      if (err) throw new Error(`Broadcast failed: ${err}`);
    });
  }

  public async calculateFeeForCoinSpends(): Promise<bigint> {
    return BigInt(1000000);
  }
}

import { Block } from "../../application/types/Block";
import type { Coin, PeerType, Tls, UnspentCoinsResponse } from '@dignetwork/datalayer-driver';
import { IL1ChiaPeer } from "../Peers/L1ChiaPeer";
import { Wallet } from "../../application/types/Wallet";


export interface IBlockchainService {
  getCurrentBlockchainHeight(): Promise<number>;
  getBlockchainBlockByHeight(height: number): Promise<Block>;
  // Key and address methods
  masterSecretKeyFromSeed(seed: Buffer): Buffer;
  secretKeyToPublicKey(secretKey: Buffer): Buffer;
  masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer;
  masterSecretKeyToWalletSyntheticSecretKey(secretKey: Buffer): Buffer;
  masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer;
  puzzleHashToAddress(puzzleHash: Buffer, prefix: string): string;
  getAddressPrefix(): string;
  signMessage(message: Buffer, privateKey: Buffer): Buffer;
  // Coin selection
  getCoinId(coin: Coin): Buffer;
  selectCoins(coins: Coin[], amount: bigint): Coin[];
  // ColdWallet/WalletService methods
  getPuzzleHash(address: string): Buffer;
  listUnspentCoins(
    peer: IL1ChiaPeer,
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer
  ): Promise<UnspentCoinsResponse>;
  isCoinSpendable(
    peer: IL1ChiaPeer,
    coinId: Buffer,
    lastHeight: number,
    headerHash: Buffer
  ): Promise<boolean>;
  connectRandom(peerType: PeerType, tls: Tls): Promise<IL1ChiaPeer>
  spendBalance(wallet: Wallet, amount: bigint, recipientAddress: string): Promise<void>;
}
import { Block } from "../types/Block";
import type { Coin, Peer, UnspentCoinsResponse } from '@dignetwork/datalayer-driver';


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
  signMessage(message: Buffer, privateKey: Buffer): Buffer;
  // Coin selection
  getCoinId(coin: Coin): Buffer;
  selectCoins(coins: Coin[], amount: bigint): Coin[];
  // ColdWallet/WalletService methods
  getPuzzleHash(address: string): Buffer;
  verifyKeySignature(signature: Buffer, publicKey: Buffer, message: Buffer): boolean;
  listUnspentCoins(
    peer: Peer,
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer
  ): Promise<UnspentCoinsResponse>;
  isCoinSpendable(
    peer: Peer,
    coinId: Buffer,
    lastHeight: number,
    headerHash: Buffer
  ): Promise<boolean>;
}
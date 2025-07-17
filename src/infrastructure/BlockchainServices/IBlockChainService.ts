import type { Coin, PeerType, Tls, UnspentCoinsResponse } from '@dignetwork/datalayer-driver';
import { IL1ChiaPeer } from "../Peers/L1ChiaPeer";
import { Wallet } from "../../application/types/Wallet";


export interface IBlockchainService {
  // Key and address methods
  masterSecretKeyFromSeed(seed: Buffer): Buffer;
  secretKeyToPublicKey(secretKey: Buffer): Buffer;
  masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer;
  masterSecretKeyToWalletSyntheticSecretKey(secretKey: Buffer): Buffer;
  masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer;
  getAddressPrefix(): string;
  signMessage(message: Buffer, privateKey: Buffer): Buffer;
  selectCoins(coins: Coin[], amount: bigint): Coin[];
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
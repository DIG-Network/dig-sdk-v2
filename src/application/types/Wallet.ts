import {
    Coin,
  getCoinId,
  masterPublicKeyToFirstPuzzleHash,
  masterPublicKeyToWalletSyntheticKey,
  masterSecretKeyToWalletSyntheticSecretKey,
  Peer,
  puzzleHashToAddress,
  secretKeyToPublicKey,
  selectCoins,
  signMessage,
} from '@dignetwork/datalayer-driver';
import { mnemonicToSeedSync } from 'bip39';
import { PrivateKey } from 'chia-bls';
import { FileCacheService } from '../services/FileCacheService';
import { CACHE_DURATION } from '../services/WalletService';
import path from 'path';
import os from 'os';

export const MIN_HEIGHT = 5777842;
export const MIN_HEIGHT_HEADER_HASH =
  "b29a4daac2434fd17a36e15ba1aac5d65012d4a66f99bed0bf2b5342e92e562c";
  
export const USER_DIR_PATH = path.join(os.homedir(), '.dig');

export class Wallet {
  private mnemonic: string;

  public constructor(mnemonic: string) {
    this.mnemonic = mnemonic;
  }

  public getMnemonic(): string {
    if (!this.mnemonic) {
      throw new Error('Mnemonic seed phrase is not loaded.');
    }
    return this.mnemonic;
  }

  public async getMasterSecretKey(): Promise<Buffer> {
    const seed = mnemonicToSeedSync(this.getMnemonic());
    return Buffer.from(PrivateKey.fromSeed(seed).toHex(), 'hex');
  }

  public async getPublicSyntheticKey(): Promise<Buffer> {
    const master_sk = await this.getMasterSecretKey();
    const master_pk = secretKeyToPublicKey(master_sk);
    return masterPublicKeyToWalletSyntheticKey(master_pk);
  }

  public async getPrivateSyntheticKey(): Promise<Buffer> {
    const master_sk = await this.getMasterSecretKey();
    return masterSecretKeyToWalletSyntheticSecretKey(master_sk);
  }

  public async getOwnerPuzzleHash(): Promise<Buffer> {
    const master_sk = await this.getMasterSecretKey();
    const master_pk = secretKeyToPublicKey(master_sk);
    return masterPublicKeyToFirstPuzzleHash(master_pk);
  }

  public async getOwnerPublicKey(): Promise<string> {
    const ownerPuzzleHash = await this.getOwnerPuzzleHash();
    return puzzleHashToAddress(ownerPuzzleHash, 'xch');
  }

  public async createKeyOwnershipSignature(nonce: string): Promise<string> {
    const message = `Signing this message to prove ownership of key.\n\nNonce: ${nonce}`;
    const privateSyntheticKey = await this.getPrivateSyntheticKey();
    const signature = signMessage(Buffer.from(message, 'utf-8'), privateSyntheticKey);
    return signature.toString('hex');
  }

  public async selectUnspentCoins(
    peer: Peer,
    coinAmount: bigint,
    feeBigInt: bigint,
    omitCoins: Coin[] = []
  ): Promise<Coin[]> {
    const cache = new FileCacheService<{ coinId: string; expiry: number }>(
      "reserved_coins",
      USER_DIR_PATH
    );

    const ownerPuzzleHash = await this.getOwnerPuzzleHash();

    // Define a function to attempt selecting unspent coins
    const trySelectCoins = async (): Promise<Coin[]> => {
      const now = Date.now();
      const omitCoinIds = omitCoins.map((coin) =>
        getCoinId(coin).toString("hex")
      );

      // Update omitCoinIds with currently valid reserved coins
      const cachedReservedCoins = cache.getCachedKeys();

      cachedReservedCoins.forEach((coinId) => {
        const reservation = cache.get(coinId);
        if (reservation && reservation.expiry > now) {
          if (!omitCoinIds.includes(coinId)) {
            omitCoinIds.push(coinId);
          }
        } else {
          cache.delete(coinId);
        }
      });

      const coinsResp = await peer.getAllUnspentCoins(
        ownerPuzzleHash,
        MIN_HEIGHT,
        Buffer.from(MIN_HEIGHT_HEADER_HASH, "hex")
      );

      const unspentCoins = coinsResp.coins.filter(
        (coin) => !omitCoinIds.includes(getCoinId(coin).toString("hex"))
      );

      const selectedCoins = selectCoins(unspentCoins, feeBigInt + coinAmount);

      return selectedCoins;
    };

    let selectedCoins: Coin[] = [];
    let retry = true;

    while (retry) {
      selectedCoins = await trySelectCoins();

      if (selectedCoins.length > 0) {
        // Coins have been successfully selected
        retry = false;
      } else {
        const now = Date.now();
        // Check if there are any valid cached reserved coins left
        const cachedReservedCoins = cache.getCachedKeys().filter((coinId) => {
          const reservation = cache.get(coinId);
          return reservation && reservation.expiry > now;
        });

        if (cachedReservedCoins.length > 0) {
          // Wait 10 seconds and try again
          await new Promise((resolve) => setTimeout(resolve, 10000));
        } else {
          // No unspent coins and no reserved coins
          throw new Error("No unspent coins available.");
        }
      }
    }

    // Reserve the selected coins
    selectedCoins.forEach((coin) => {
      const coinId = getCoinId(coin).toString("hex");
      cache.set(coinId, { coinId, expiry: Date.now() + CACHE_DURATION });
    });

    return selectedCoins;
  }
}

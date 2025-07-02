import { mnemonicToSeedSync } from 'bip39';
import { FileCacheService } from '../services/FileCacheService';
import type { IBlockchainService } from '../interfaces/IBlockChainService';
import { Coin, PeerType } from '@dignetwork/datalayer-driver';
import { ChiaBlockchainService } from '../../infrastructure/BlockchainServices/ChiaBlockchainService';
import { ILevel1Peer } from '../interfaces/ILevel1Peer';

const COIN_CACHE_DURATION = 600000;

export interface IWallet {
  getMnemonic(): string;
  getMasterSecretKey(): Promise<Buffer>;
  getPublicSyntheticKey(): Promise<Buffer>;
  getPrivateSyntheticKey(): Promise<Buffer>;
  getOwnerPuzzleHash(): Promise<Buffer>;
  getOwnerPublicKey(peerType: PeerType): Promise<string>;
  createKeyOwnershipSignature(nonce: string): Promise<string>;
  selectUnspentCoins(
    peer: ILevel1Peer,
    coinAmount: bigint,
    feeBigInt: bigint,
    omitCoins?: Coin[],
    lastHeight?: number,
    lastHeaderHash?: string,
  ): Promise<Coin[]>;
}

export class Wallet implements IWallet {
  private mnemonic: string;
  private blockchain: IBlockchainService;

  public constructor(mnemonic: string) {
    this.mnemonic = mnemonic;
    this.blockchain = new ChiaBlockchainService();
  }

  public getMnemonic(): string {
    if (!this.mnemonic) {
      throw new Error('Mnemonic seed phrase is not loaded.');
    }
    return this.mnemonic;
  }

  public async getMasterSecretKey(): Promise<Buffer> {
    const seed = mnemonicToSeedSync(this.getMnemonic());
    return this.blockchain.masterSecretKeyFromSeed(seed);
  }

  public async getPublicSyntheticKey(): Promise<Buffer> {
    const master_sk = await this.getMasterSecretKey();
    const master_pk = this.blockchain.secretKeyToPublicKey(master_sk);
    return this.blockchain.masterPublicKeyToWalletSyntheticKey(master_pk);
  }

  public async getPrivateSyntheticKey(): Promise<Buffer> {
    const master_sk = await this.getMasterSecretKey();
    return this.blockchain.masterSecretKeyToWalletSyntheticSecretKey(master_sk);
  }

  public async getOwnerPuzzleHash(): Promise<Buffer> {
    const master_sk = await this.getMasterSecretKey();
    const master_pk = this.blockchain.secretKeyToPublicKey(master_sk);
    return this.blockchain.masterPublicKeyToFirstPuzzleHash(master_pk);
  }

  public async getOwnerPublicKey(peerType: PeerType): Promise<string> {
    const ownerPuzzleHash = await this.getOwnerPuzzleHash();
    return this.blockchain.puzzleHashToAddress(ownerPuzzleHash, peerType === PeerType.Mainnet ? 'xch' : 'txch');
  }

  public async createKeyOwnershipSignature(nonce: string): Promise<string> {
    const message = `Signing this message to prove ownership of key.\n\nNonce: ${nonce}`;
    const privateSyntheticKey = await this.getPrivateSyntheticKey();
    const signature = this.blockchain.signMessage(Buffer.from(message, 'utf-8'), privateSyntheticKey);
    return signature.toString('hex');
  }

  public async selectUnspentCoins(
    peer: ILevel1Peer,
    coinAmount: bigint,
    feeBigInt: bigint,
    omitCoins: Coin[] = [],
    lastHeight: number,
    lastHeaderHash: string,
  ): Promise<Coin[]> {
    const cache = new FileCacheService<{ coinId: string; expiry: number }>('reserved_coins');

    const ownerPuzzleHash = await this.getOwnerPuzzleHash();

    // Define a function to attempt selecting unspent coins
    const trySelectCoins = async (): Promise<Coin[]> => {
      const now = Date.now();
      const omitCoinIds = omitCoins.map((coin) => this.blockchain.getCoinId(coin).toString('hex'));

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
        lastHeight,
        Buffer.from(lastHeaderHash, 'hex'),
      );

      const unspentCoins = coinsResp.coins.filter(
        (coin) => !omitCoinIds.includes(this.blockchain.getCoinId(coin).toString('hex')),
      );

      const selectedCoins = this.blockchain.selectCoins(unspentCoins, feeBigInt + coinAmount);

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
          throw new Error('No unspent coins available.');
        }
      }
    }

    // Reserve the selected coins
    selectedCoins.forEach((coin) => {
      const coinId = this.blockchain.getCoinId(coin).toString('hex');
      cache.set(coinId, { coinId, expiry: Date.now() + COIN_CACHE_DURATION });
    });

    return selectedCoins;
  }
}

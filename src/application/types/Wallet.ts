import { mnemonicToSeedSync } from 'bip39';
import type { IBlockchainService } from '../../infrastructure/BlockchainServices/IBlockChainService';
import { ChiaBlockchainService } from '../../infrastructure/BlockchainServices/ChiaBlockchainService';
import config from '../../config';
import { IColdWallet } from './ColdWallet';
import { EventEmitter } from 'events';

export interface IWallet extends IColdWallet {
  getMnemonic(): string;
  getMasterSecretKey(): Buffer;
  getPublicSyntheticKey(): Buffer;
  getPrivateSyntheticKey(): Buffer;
  getOwnerPublicKey(): Promise<string>;
  createKeyOwnershipSignature(nonce: string): Promise<string>;
}

export class Wallet extends EventEmitter implements IWallet {
  private mnemonic: string;
  private blockchain: IBlockchainService;

  public constructor(mnemonic: string) {
    super();
    this.mnemonic = mnemonic;
    switch (config.BLOCKCHAIN) {
      case 'chia':
      default:
        this.blockchain = new ChiaBlockchainService();
        break;
    }
  }

  public getMnemonic(): string {
    if (!this.mnemonic) {
      throw new Error('Mnemonic seed phrase is not loaded.');
    }
    return this.mnemonic;
  }

  public getMasterSecretKey(): Buffer {
    const seed = mnemonicToSeedSync(this.getMnemonic());
    return this.blockchain.masterSecretKeyFromSeed(seed);
  }

  public getPublicSyntheticKey(): Buffer {
    const master_sk = this.getMasterSecretKey();
    const master_pk = this.blockchain.secretKeyToPublicKey(master_sk);
    return this.blockchain.masterPublicKeyToWalletSyntheticKey(master_pk);
  }

  public getPrivateSyntheticKey(): Buffer {
    const master_sk = this.getMasterSecretKey();
    return this.blockchain.masterSecretKeyToWalletSyntheticSecretKey(master_sk);
  }

  public getPuzzleHash(): Buffer {
    const master_sk = this.getMasterSecretKey();
    const master_pk = this.blockchain.secretKeyToPublicKey(master_sk);
    return this.blockchain.masterPublicKeyToFirstPuzzleHash(master_pk);
  }

  public async getOwnerPublicKey(): Promise<string> {
    const ownerPuzzleHash = await this.getPuzzleHash();
    let prefix = this.blockchain.getAddressPrefix();
    return ChiaBlockchainService.puzzleHashToAddress(ownerPuzzleHash, prefix);
  }

  public async createKeyOwnershipSignature(nonce: string): Promise<string> {
    const message = `Signing this message to prove ownership of key.\n\nNonce: ${nonce}`;
    const privateSyntheticKey = await this.getPrivateSyntheticKey();
    const signature = this.blockchain.signMessage(
      Buffer.from(message, 'utf-8'),
      privateSyntheticKey,
    );
    return signature.toString('hex');
  }

  public masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer {
    return this.blockchain.masterPublicKeyToWalletSyntheticKey(publicKey);
  }

  public masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer {
    return this.blockchain.masterPublicKeyToFirstPuzzleHash(publicKey);
  }
}

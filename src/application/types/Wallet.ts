import { mnemonicToSeedSync } from 'bip39';
import type { IBlockchainService } from '../../infrastructure/BlockchainServices/IBlockChainService';
import { ChiaBlockchainService } from '../../infrastructure/BlockchainServices/ChiaBlockchainService';
import { IAssetBalance } from './AssetBalance';
import { IBalanceRepository } from '../repositories/Interfaces/IBalanceRepository';
import config from '../../config';
import { ChiaBalanceRepository } from '../../infrastructure/Repositories/ChiaBalanceRepository';
import { IColdWallet } from './ColdWallet';

export interface IWallet extends IColdWallet {
  getMnemonic(): string;
  getMasterSecretKey(): Promise<Buffer>;
  getPublicSyntheticKey(): Promise<Buffer>;
  getPrivateSyntheticKey(): Promise<Buffer>;
  getOwnerPublicKey(): Promise<string>;
  createKeyOwnershipSignature(nonce: string): Promise<string>;
}

export class Wallet implements IWallet {
  private mnemonic: string;
  private blockchain: IBlockchainService;
  private balanceRepository: IBalanceRepository;

  public constructor(mnemonic: string) {
    this.mnemonic = mnemonic;

    switch (config.BLOCKCHAIN) {
      case 'chia':
      default:
        this.blockchain = new ChiaBlockchainService();
        this.balanceRepository = new ChiaBalanceRepository();
        break;
    }
  }

  public getMnemonic(): string {
    if (!this.mnemonic) {
      throw new Error('Mnemonic seed phrase is not loaded.');
    }
    return this.mnemonic;
  }

  public async getBalance(assetId: string): Promise<IAssetBalance> {
    let address = await this.getOwnerPublicKey();
    const balance = await this.balanceRepository.getBalance(address, assetId);
    return { assetId, balance };
  }

  public async getBalances(): Promise<IAssetBalance[]> {
    let address = await this.getOwnerPublicKey();
    return this.balanceRepository.getBalancesByAsset(address);
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

  public async getPuzzleHash(): Promise<Buffer> {
    const master_sk = await this.getMasterSecretKey();
    const master_pk = this.blockchain.secretKeyToPublicKey(master_sk);
    return this.blockchain.masterPublicKeyToFirstPuzzleHash(master_pk);
  }

  public async getOwnerPublicKey(): Promise<string> {
    const ownerPuzzleHash = await this.getPuzzleHash();
    let prefix = this.blockchain.getAddressPrefix();
    return this.blockchain.puzzleHashToAddress(ownerPuzzleHash, prefix);
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

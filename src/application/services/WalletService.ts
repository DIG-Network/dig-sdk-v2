import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import { NconfService } from '../../infrastructure/ConfigurationServices/NconfService';
import { EncryptionService } from './EncryptionService';
import { EncryptedData } from '../types/EncryptedData';
import { Wallet } from '../types/Wallet';
import type { IBlockchainService } from '../interfaces/IBlockChainService';
import { ChiaBlockchainService } from '../../infrastructure/BlockchainServices/ChiaBlockchainService';
import { Peer } from '@dignetwork/datalayer-driver';

const KEYRING_FILE = 'keyring.json';

export class WalletService {
  private static blockchain: IBlockchainService = new ChiaBlockchainService();

  public static async loadWallet(walletName: string = 'default'): Promise<Wallet> {
    const mnemonic = await this.getMnemonicFromKeyring(walletName);
    if (mnemonic) return new Wallet(mnemonic);

    throw new Error('Wallet Not Found');
  }

  public static async createNewWallet(walletName: string): Promise<Wallet> {
    const mnemonic = bip39.generateMnemonic(256);
    await this.saveWalletToKeyring(walletName, mnemonic);
    return await this.loadWallet(walletName);
  }

  public static async deleteWallet(walletName: string): Promise<boolean> {
    const nconfService = new NconfService(KEYRING_FILE);
    if (await nconfService.configExists()) {
      return await nconfService.deleteConfigValue(walletName);
    }
    return false;
  }

  public static async listWallets(): Promise<string[]> {
    const nconfService = new NconfService(KEYRING_FILE);
    if (!(await nconfService.configExists())) {
      return [];
    }

    const configData = await nconfService.getFullConfig();
    return Object.keys(configData);
  }

  public static async verifyKeyOwnershipSignature(
    nonce: string,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    const message = `Signing this message to prove ownership of key.\n\nNonce: ${nonce}`;
    return this.blockchain.verifyKeySignature(
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex'),
      Buffer.from(message, 'utf-8'),
    );
  }

  public static async calculateFeeForCoinSpends(): Promise<bigint> {
    return BigInt(1000000);
  }

  public static async isCoinSpendable(peer: Peer, coinId: Buffer, lastHeight: number, lastHeaderHash: string): Promise<boolean> {
    try {
      return await this.blockchain.isCoinSpendable(peer, coinId, lastHeight, Buffer.from(lastHeaderHash, 'hex'));
    } catch {
      return false;
    }
  }

  private static async getMnemonicFromKeyring(walletName: string): Promise<string | null> {
    const nconfService = new NconfService(KEYRING_FILE);
    if (await nconfService.configExists()) {
      const encryptedData: EncryptedData | null = await nconfService.getConfigValue(walletName);
      if (encryptedData) {
        return EncryptionService.decryptData(encryptedData);
      }
    }
    return null;
  }

  private static async saveWalletToKeyring(walletName: string, mnemonic: string): Promise<void> {
    const nconfService = new NconfService(KEYRING_FILE);
    const encryptedData = EncryptionService.encryptData(mnemonic);
    await nconfService.setConfigValue(walletName, encryptedData);
  }
}

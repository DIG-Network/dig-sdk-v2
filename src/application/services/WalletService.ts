import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import { NconfService } from '../../infrastructure/ConfigurationServices/NconfService';
import { EncryptionService } from './EncryptionService';
import { EncryptedData } from '../types/EncryptedData';
import { MIN_HEIGHT, MIN_HEIGHT_HEADER_HASH, Wallet } from '../types/Wallet';
import { Peer, verifySignedMessage } from '@dignetwork/datalayer-driver';

export const KEYRING_FILE = 'keyring.json';
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class WalletService {
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

    const config = await nconfService.getFullConfig();
    return Object.keys(config);
  }

  public static async verifyKeyOwnershipSignature(
    nonce: string,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    const message = `Signing this message to prove ownership of key.\n\nNonce: ${nonce}`;
    return verifySignedMessage(
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex'),
      Buffer.from(message, 'utf-8'),
    );
  }

  public static async calculateFeeForCoinSpends(): Promise<bigint> {
    return BigInt(1000000);
  }

  public static async isCoinSpendable(peer: Peer, coinId: Buffer): Promise<boolean> {
    try {
      return await peer.isCoinSpent(coinId, MIN_HEIGHT, Buffer.from(MIN_HEIGHT_HEADER_HASH, 'hex'));
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

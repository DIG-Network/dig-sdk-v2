import * as bip39 from 'bip39';
import { NconfService } from '../../infrastructure/ConfigurationServices/NconfService';
import { EncryptionService } from './EncryptionService';
import { EncryptedData } from '../types/EncryptedData';
import { Wallet } from '../types/Wallet';
import { AddressRepository } from '../repositories/AddressRepository';
import { Address } from '../../infrastructure/entities/Address';

const KEYRING_FILE = 'keyring.json';

export class WalletService {
  private static addressRepo: AddressRepository = new AddressRepository();

  public static async loadWallet(addressName: string = 'default'): Promise<Wallet> {
    const mnemonic = await this.getMnemonicFromKeyring(addressName);

    if (mnemonic) {
      const wallet = new Wallet(mnemonic);
      return wallet;
    }

    throw new Error('Address Not Found');
  }

  public static async createWallet(addressName: string, mnemonic?: string): Promise<Wallet> {
    if (await this.addressExists(addressName)) {
      throw new Error('Address with the same name already exists.');
    }
    const generatedMnemonic = bip39.generateMnemonic(256);
    await this.saveAddressToKeyring(addressName, mnemonic ?? generatedMnemonic);
    let wallet = await this.loadWallet(addressName);
    const address = await wallet.getOwnerPublicKey();
    await WalletService.addressRepo.addAddress(address, addressName);

    return wallet;
  }

  public static async deleteWallet(addressName: string): Promise<boolean> {
    const nconfService = new NconfService(KEYRING_FILE);
    let deleted = false;
    if (await nconfService.configExists()) {
      deleted = await nconfService.deleteConfigValue(addressName);
    }
    // Remove from DB as well
    await WalletService.addressRepo.removeAddressByName(addressName);
    return deleted;
  }

  public static async getWallets(): Promise<Address[]> {
    return WalletService.addressRepo.getAddresses();
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

  private static async saveAddressToKeyring(walletName: string, mnemonic: string): Promise<void> {
    const nconfService = new NconfService(KEYRING_FILE);
    const encryptedData = EncryptionService.encryptData(mnemonic);
    await nconfService.setConfigValue(walletName, encryptedData);
  }
  
  private static async addressExists(addressName: string): Promise<boolean> {
    const nconfService = new NconfService(KEYRING_FILE);
    if (await nconfService.configExists()) {
      const existing = await nconfService.getConfigValue(addressName);
      return !!existing;
    }
    return false;
  }
}

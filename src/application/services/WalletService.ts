import * as bip39 from 'bip39';
import { NconfService } from '../../infrastructure/ConfigurationServices/NconfService';
import { EncryptionService } from './EncryptionService';
import { EncryptedData } from '../types/EncryptedData';

import { Wallet } from '../types/Wallet';
import { ColdWallet } from '../types/ColdWallet';
import { AddressRepository } from '../repositories/AddressRepository';
import { Address } from '../entities/Address';

export enum WalletType {
  Wallet = 'wallet',
  ColdWallet = 'coldwallet',
}

const KEYRING_FILE = 'keyring.json';

export class WalletService {
  private static addressRepo: AddressRepository = new AddressRepository();

  public static async loadWallet(addressName: string = 'default'): Promise<Wallet | ColdWallet> {
    const addresses = await WalletService.addressRepo.getAddresses();
    const found = addresses.find((a) => a.name === addressName);
    if (!found) throw new Error('Address Not Found');
    const type: WalletType = (found.type as WalletType) || WalletType.Wallet;
    if (type === WalletType.ColdWallet) {
      return new ColdWallet(found.address);
    } else {
      const mnemonic = await this.getMnemonicFromKeyring(addressName);
      if (mnemonic !== null) {
        return new Wallet(mnemonic);
      }
      throw new Error('Mnemonic not found for wallet');
    }
  }

  /**
   * Creates a new Wallet (hot wallet) with the given address and mnemonic.
   * @param addressName The name to associate with the wallet.
   * @param address The address for the wallet (public key or similar).
   * @param mnemonic The mnemonic phrase for the wallet.
   */
  /**
   * Creates a new Wallet (hot wallet) with the given address and optional mnemonic.
   * If mnemonic is not provided, it will be generated.
   */
  public static async createWallet(addressName: string, mnemonic?: string): Promise<Wallet> {
    if (await this.addressExists(addressName)) {
      throw new Error('Address with the same name already exists.');
    }
    const finalMnemonic = mnemonic ?? bip39.generateMnemonic(256);
    await this.saveAddressToKeyring(addressName, finalMnemonic);
    let wallet = new Wallet(finalMnemonic);
    const address = await wallet.getOwnerPublicKey();
    await WalletService.addressRepo.addAddress(address, addressName, 'default', WalletType.Wallet);
    return wallet;
  }

  /**
   * Creates a new ColdWallet with the given address.
   * @param addressName The name to associate with the cold wallet.
   * @param address The address for the cold wallet.
   */
  public static async createColdWallet(addressName: string, address: string): Promise<ColdWallet> {
    if (await this.addressExists(addressName)) {
      throw new Error('Address with the same name already exists.');
    }
    await WalletService.addressRepo.addAddress(
      address,
      addressName,
      'default',
      WalletType.ColdWallet,
    );
    return new ColdWallet(address);
  }

  public static async deleteWallet(addressName: string): Promise<boolean> {
    const nconfService = new NconfService(KEYRING_FILE);
    let deleted = false;
    if (await nconfService.configExists()) {
      deleted = await nconfService.deleteConfigValue(addressName);
    }
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

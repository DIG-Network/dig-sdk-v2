import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import { NconfService } from '../../infrastructure/ConfigurationServices/NconfService';
import { EncryptionService } from './EncryptionService';
import { EncryptedData } from '../types/EncryptedData';
import { Wallet } from '../types/Wallet';
import type { IBlockchainService } from '../interfaces/IBlockChainService';
import { ChiaBlockchainService } from '../../infrastructure/BlockchainServices/ChiaBlockchainService';
import { IL1Peer } from '../interfaces/IL1Peer';
import { AddressRow, WalletRepository } from '../repositories/WalletRepository';

const KEYRING_FILE = 'keyring.json';

export class WalletService {
  private blockchain: IBlockchainService;
  private static walletRepo: WalletRepository = new WalletRepository();

  constructor() {
    this.blockchain = new ChiaBlockchainService();
  }

  public static async loadAddress(addressName: string = 'default'): Promise<Wallet> {
    const mnemonic = await this.getMnemonicFromKeyring(addressName);
    if (mnemonic) {
      const wallet = new Wallet(mnemonic);
      return wallet;
    }

    throw new Error('Address Not Found');
  }

  public static async createAddress(addressName: string, mnemonic?: string): Promise<Wallet> {
    const generatedMnemonic = bip39.generateMnemonic(256);
    await this.saveAddressToKeyring(addressName, mnemonic ?? generatedMnemonic);
    let wallet = await this.loadAddress(addressName);
    const address = await wallet.getOwnerPublicKey();
    WalletService.walletRepo.addAddress(address, addressName);

    return wallet;
  }

  public static async deleteAddress(addressName: string): Promise<boolean> {
    const nconfService = new NconfService(KEYRING_FILE);
    let deleted = false;
    if (await nconfService.configExists()) {
      deleted = await nconfService.deleteConfigValue(addressName);
    }
    // Remove from DB as well
    WalletService.walletRepo.removeAddressByName(addressName);
    return deleted;
  }

  public static getAddresses(): AddressRow[] {
    return WalletService.walletRepo.getAddresses();
  }

  public async calculateFeeForCoinSpends(): Promise<bigint> {
    return BigInt(1000000);
  }

  public async isCoinSpendable(peer: IL1Peer, coinId: Buffer, lastHeight: number, lastHeaderHash: string): Promise<boolean> {
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

  private static async saveAddressToKeyring(walletName: string, mnemonic: string): Promise<void> {
    const nconfService = new NconfService(KEYRING_FILE);
    const encryptedData = EncryptionService.encryptData(mnemonic);
    await nconfService.setConfigValue(walletName, encryptedData);
  }
}

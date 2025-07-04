import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import { NconfService } from '../../infrastructure/ConfigurationServices/NconfService';
import { EncryptionService } from './EncryptionService';
import { EncryptedData } from '../types/EncryptedData';
import { Wallet } from '../types/Wallet';
import type { IBlockchainService } from '../interfaces/IBlockChainService';
import { ChiaBlockchainService } from '../../infrastructure/BlockchainServices/ChiaBlockchainService';
import { IL1Peer } from '../interfaces/IL1Peer';
import Database from 'better-sqlite3';
import { WalletRepository, AddressRow } from '../repositories/WalletRepository';
import { PeerType } from '@dignetwork/datalayer-driver';

const KEYRING_FILE = 'keyring.json';
const WALLET_DB_FILE = 'wallet.sqlite';

export class WalletService {
  private blockchain: IBlockchainService;
  private static db: Database.Database = new Database(WALLET_DB_FILE);
  private static walletRepo: WalletRepository = new WalletRepository(WalletService.db);

  constructor() {
    this.blockchain = new ChiaBlockchainService();
  }

  public async loadWallet(walletName: string = 'default'): Promise<Wallet> {
    const mnemonic = await this.getMnemonicFromKeyring(walletName);
    if (mnemonic) {
      const wallet = new Wallet(mnemonic);
      return wallet;
    }

    throw new Error('Wallet Not Found');
  }

  public async createNewWallet(walletName: string, peerType: PeerType, mnemonic?: string): Promise<Wallet> {
    const generatedMnemonic = bip39.generateMnemonic(256);
    await this.saveWalletToKeyring(walletName, mnemonic ?? generatedMnemonic);
    let wallet = await this.loadWallet(walletName);
    const address = await wallet.getOwnerPublicKey(peerType);
    WalletService.walletRepo.addWallet(address, walletName);

    return wallet;
  }

  public async deleteWallet(walletName: string): Promise<boolean> {
    const nconfService = new NconfService(KEYRING_FILE);
    let deleted = false;
    if (await nconfService.configExists()) {
      deleted = await nconfService.deleteConfigValue(walletName);
    }
    // Remove from DB as well
    WalletService.walletRepo.removeWalletByName(walletName);
    return deleted;
  }

  public static getAddresses(): AddressRow[] {
    return WalletService.walletRepo.getWallets();
  }

  public async verifyKeyOwnershipSignature(
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

  private async getMnemonicFromKeyring(walletName: string): Promise<string | null> {
    const nconfService = new NconfService(KEYRING_FILE);
    if (await nconfService.configExists()) {
      const encryptedData: EncryptedData | null = await nconfService.getConfigValue(walletName);
      if (encryptedData) {
        return EncryptionService.decryptData(encryptedData);
      }
    }
    return null;
  }

  private async saveWalletToKeyring(walletName: string, mnemonic: string): Promise<void> {
    const nconfService = new NconfService(KEYRING_FILE);
    const encryptedData = EncryptionService.encryptData(mnemonic);
    await nconfService.setConfigValue(walletName, encryptedData);
  }
}

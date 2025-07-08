import { Wallet } from '../../../src/application/types/Wallet';
import { WalletService } from '../../../src/application/services/WalletService';
import { setupTable } from '../../../src/application/repositories/WalletRepository';
import Database from 'better-sqlite3';
import config from '../../../src/config';
import fs from 'fs-extra';
import path from 'path';

const WALLET_NAMES = ['wallet1', 'wallet2', 'wallet3'];

let walletService: WalletService;

// Helper to clean up all wallets before each test
async function cleanupWallets() {
  // Drop the wallet table to force schema recreation with the 'name' column
  const Database = require('better-sqlite3');
  const db = new Database('wallet.sqlite');
  db.prepare('DROP TABLE IF EXISTS wallet').run();
  db.close();
}

describe('WalletService Integration', () => {
  beforeEach(async () => {
    config.BLOCKCHAIN_NETWORK = 'testnet';
    await cleanupWallets();
    setupTable(new Database('wallet.sqlite'));
    walletService = new WalletService();
    // Clean up keyring file before each test
    const keyringPath = path.resolve('.dig/keyring.json');
    if (await fs.pathExists(keyringPath)) {
      await fs.remove(keyringPath);
    }
  });

  it('should create, load, and delete a wallet, and verify Wallet functionality', async () => {
    // Create a new wallet
    const wallet = await WalletService.createAddress(WALLET_NAMES[0]);
    expect(wallet).toBeInstanceOf(Wallet);
    const mnemonic = wallet.getMnemonic();
    expect(typeof mnemonic).toBe('string');
    expect(mnemonic.split(' ').length).toBeGreaterThanOrEqual(12);

    // Load the wallet
    const loadedWallet = await WalletService.loadAddress(WALLET_NAMES[0]);
    expect(loadedWallet).toBeInstanceOf(Wallet);
    expect(loadedWallet.getMnemonic()).toBe(mnemonic);

    // Wallet class: getMasterSecretKey returns a Buffer
    const masterSecretKey = await loadedWallet.getMasterSecretKey();
    expect(Buffer.isBuffer(masterSecretKey)).toBe(true);
    expect(masterSecretKey.length).toBeGreaterThan(0);

    // Wallet class: getPublicSyntheticKey returns a Buffer
    const publicSyntheticKey = await loadedWallet.getPublicSyntheticKey();
    expect(Buffer.isBuffer(publicSyntheticKey)).toBe(true);

    // Wallet class: getPrivateSyntheticKey returns a Buffer
    const privateSyntheticKey = await loadedWallet.getPrivateSyntheticKey();
    expect(Buffer.isBuffer(privateSyntheticKey)).toBe(true);

    // Wallet class: getPuzzleHash returns a Buffer
    const ownerPuzzleHash = await loadedWallet.getPuzzleHash();
    expect(Buffer.isBuffer(ownerPuzzleHash)).toBe(true);

    // Wallet class: getOwnerPublicKey returns a string
    const ownerPublicKey = await loadedWallet.getOwnerPublicKey();
    expect(typeof ownerPublicKey).toBe('string');
    expect(ownerPublicKey.length).toBeGreaterThan(0);

    // Wallet class: createKeyOwnershipSignature returns a string
    const signature = await loadedWallet.createKeyOwnershipSignature('nonce123');
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);

    // Delete the wallet
    const deleted = await WalletService.deleteAddress(WALLET_NAMES[0]);
    expect(deleted).toBe(true);
    await expect(WalletService.loadAddress(WALLET_NAMES[0])).rejects.toThrow('Address Not Found');
  });

  it('should return empty array if no wallets exist', async () => {
    const wallets = WalletService.getAddresses();
    expect(wallets).toEqual([]);
  });

  it('should list wallets after multiple creates and deletes', async () => {
    const createdAddresses: string[] = [];
    for (const name of WALLET_NAMES) {
      const wallet = await WalletService.createAddress(name);
      createdAddresses.push(await wallet.getOwnerPublicKey());
    }
    let wallets = WalletService.getAddresses();
    let walletAddresses = wallets.map((w: any) => w.address);
    // All created addresses should be present
    for (const addr of createdAddresses) {
      expect(walletAddresses).toContain(addr);
    }
    // Delete one wallet
    await WalletService.deleteAddress(WALLET_NAMES[1]);
    wallets = WalletService.getAddresses();
    walletAddresses = wallets.map((w: any) => w.address);
    // The deleted wallet's address should not be present
    expect(walletAddresses).not.toContain(createdAddresses[1]);
    // The other two should still be present
    expect(walletAddresses).toContain(createdAddresses[0]);
    expect(walletAddresses).toContain(createdAddresses[2]);
    // Delete all
    await WalletService.deleteAddress(WALLET_NAMES[0]);
    await WalletService.deleteAddress(WALLET_NAMES[2]);
    wallets = WalletService.getAddresses();
    expect(wallets).toEqual([]);
  });

  it('should not be able to delete or load a non-existing wallet', async () => {
    const deleted = await WalletService.deleteAddress('nonexistent');
    expect(deleted).toBe(false);
    // Try to load a non-existent wallet
    await expect(WalletService.loadAddress('nonexistent')).rejects.toThrow('Address Not Found');
  });

  it('should throw if address already exists when creating address', async () => {
    const keyringPath = path.resolve('keyring.json');
    await WalletService.createAddress('any');
    // Ensure the file exists
    await fs.ensureFile(keyringPath);
    await expect(WalletService.createAddress('any')).rejects.toThrow('Address with the same name already exists.');
    // Clean up
    await fs.remove(keyringPath);
  });

  describe('calculateFeeForCoinSpends', () => {
    it('should return the default fee, but fail if not changed after 1 year', async () => {
      const now = new Date();
      const cutoff = new Date('2026-06-24T00:00:00Z'); // 1 year from today
      if (now >= cutoff) {
        throw new Error('calculateFeeForCoinSpends must be reviewed and updated after 1 year!');
      }
      const fee = await walletService.calculateFeeForCoinSpends();
      expect(fee).toBe(BigInt(1000000));
    });
  });
});

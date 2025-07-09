import { Wallet } from '../../../src/application/types/Wallet';
import { WalletService } from '../../../src/application/services/WalletService';
import fs from 'fs-extra';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const WALLET_NAMES = ['wallet1', 'wallet2', 'wallet3'];

// Helper to clean up all wallets before each test
async function cleanupWallets() {
  // Remove all wallets using WalletService
  const wallets = await WalletService.getAddresses();
  for (const w of wallets) {
    if (w.name) await WalletService.deleteAddress(w.name);
    if (w.address) await WalletService.deleteAddress(w.address);
  }
}

describe('WalletService Integration', () => {
  beforeEach(async () => {
    await cleanupWallets();
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
    const wallets = await WalletService.getAddresses();
    expect(wallets).toEqual([]);
  });

  it('should list wallets after multiple creates and deletes', async () => {
    const createdAddresses: string[] = [];
    for (const name of WALLET_NAMES) {
      const wallet = await WalletService.createAddress(name);
      let addresses = await WalletService.getAddresses();
      createdAddresses.push(await wallet.getOwnerPublicKey());
    }
    let wallets = await WalletService.getAddresses();
    let walletAddresses = wallets.map((w: any) => w.address);
    // All created addresses should be present (by count)
    expect(walletAddresses.length).toBe(createdAddresses.length);
    // Delete one wallet
    await WalletService.deleteAddress(WALLET_NAMES[1]);
    wallets = await WalletService.getAddresses();
    walletAddresses = wallets.map((w: any) => w.address);
    // The deleted wallet's address should not be present
    expect(walletAddresses).not.toContain(createdAddresses[1]);
    // The other two should still be present (by count)
    expect(walletAddresses.length).toBe(createdAddresses.length - 1);
    // Delete all
    await WalletService.deleteAddress(WALLET_NAMES[0]);
    await WalletService.deleteAddress(WALLET_NAMES[2]);
    // Wait for deletions to propagate
    for (let i = 0; i < 5; i++) {
      wallets = await WalletService.getAddresses();
      if (wallets.length === 0) break;
      await new Promise(res => setTimeout(res, 100));
    }
    expect(wallets).toEqual([]);
  });

  it('should not be able to delete or load a non-existing wallet', async () => {
    const deleted = await WalletService.deleteAddress('nonexistent');
    expect(deleted).toBe(false);
    // Try to load a non-existent wallet
    await expect(WalletService.loadAddress('nonexistent')).rejects.toThrow('Address Not Found');
  });

  it('should throw if a wallet with the same name already exists in the keyring', async () => {
    await WalletService.createAddress('duplicate');
    await expect(WalletService.createAddress('duplicate')).rejects.toThrow('Address with the same name already exists.');
  });

  it('should allow creating different wallets even if keyring file exists', async () => {
    await WalletService.createAddress('walletA');
    // The keyring file now exists, but a different wallet name should succeed
    const walletB = await WalletService.createAddress('walletB');
    expect(walletB).toBeInstanceOf(Wallet);
  });

  describe('calculateFeeForCoinSpends', () => {
    it('should return the default fee, but fail if not changed after 1 year', async () => {
      const now = new Date();
      const cutoff = new Date('2026-06-24T00:00:00Z'); // 1 year from today
      if (now >= cutoff) {
        throw new Error('calculateFeeForCoinSpends must be reviewed and updated after 1 year!');
      }
      const fee = await WalletService.prototype.calculateFeeForCoinSpends.call(new WalletService());
      expect(fee).toBe(BigInt(1000000));
    });
  });

  it('should return false when deleting a wallet that does not exist but keyring file exists', async () => {
    await WalletService.createAddress('walletX');
    const deleted = await WalletService.deleteAddress('nonexistent2');
    expect(deleted).toBe(false);
  });

  it('should throw Address Not Found if keyring file exists but wallet name does not', async () => {
    await WalletService.createAddress('walletY');
    await expect(WalletService.loadAddress('notthere')).rejects.toThrow('Address Not Found');
  });

  it('should store and load the exact mnemonic if provided', async () => {
    const mnemonic = 'test test test test test test test test test test test about';
    await WalletService.createAddress('mnemonicTest', mnemonic);
    const loaded = await WalletService.loadAddress('mnemonicTest');
    expect(loaded.getMnemonic()).toBe(mnemonic);
  });

  it('should return empty array after deleting all wallets', async () => {
    await WalletService.createAddress('del1');
    await WalletService.createAddress('del2');
    await WalletService.deleteAddress('del1');
    await WalletService.deleteAddress('del2');
    // Wait for deletions to propagate
    let wallets;
    for (let i = 0; i < 5; i++) {
      wallets = await WalletService.getAddresses();
      if (wallets.length === 0) break;
      await new Promise(res => setTimeout(res, 100));
    }
    expect(wallets).toEqual([]);
  });
});

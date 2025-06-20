import { WalletService } from '../../../src/application/services/WalletService';
import { Wallet } from '../../../src/application/types/Wallet';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

const TEST_KEYRING_FILE = 'keyring.json';
const WALLET_NAMES = ['wallet1', 'wallet2', 'wallet3'];

async function cleanupKeyring() {
    const keyringPath = path.join(path.join(os.homedir(), '.dig'), TEST_KEYRING_FILE);
  if (
    await fs.promises.stat(keyringPath).then(
      () => true,
      () => false,
    )
  ) {
    await fs.promises.unlink(keyringPath);
  }
}

describe('WalletService Integration', () => {
  beforeEach(async () => {
    await cleanupKeyring();
  });

  it('should create, load, and delete a wallet, and verify Wallet functionality', async () => {
    // Patch the keyring file and user dir for isolation
    (WalletService as any).KEYRING_FILE = TEST_KEYRING_FILE;

    // Create a new wallet
    const wallet = await WalletService.createNewWallet(WALLET_NAMES[0]);
    expect(wallet).toBeInstanceOf(Wallet);
    const mnemonic = wallet.getMnemonic();
    expect(typeof mnemonic).toBe('string');
    expect(mnemonic.split(' ').length).toBeGreaterThanOrEqual(12);

    // Load the wallet
    const loadedWallet = await WalletService.loadWallet(WALLET_NAMES[0]);
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

    // Wallet class: getOwnerPuzzleHash returns a Buffer
    const ownerPuzzleHash = await loadedWallet.getOwnerPuzzleHash();
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
    const deleted = await WalletService.deleteWallet(WALLET_NAMES[0]);
    expect(deleted).toBe(true);
    await expect(WalletService.loadWallet(WALLET_NAMES[0])).rejects.toThrow('Wallet Not Found');
  });

  it('should return empty array if no wallets exist', async () => {
    (WalletService as any).KEYRING_FILE = TEST_KEYRING_FILE;

    const wallets = await WalletService.listWallets();
    expect(wallets).toEqual([]);
  });

  it('should list wallets after multiple creates and deletes', async () => {
    (WalletService as any).KEYRING_FILE = TEST_KEYRING_FILE;

    // Create wallets
    for (const name of WALLET_NAMES) {
      await WalletService.createNewWallet(name);
    }
    let wallets = await WalletService.listWallets();
    expect(wallets.sort()).toEqual(WALLET_NAMES.sort());
    // Delete one wallet
    await WalletService.deleteWallet(WALLET_NAMES[1]);
    wallets = await WalletService.listWallets();
    expect(wallets.sort()).toEqual([WALLET_NAMES[0], WALLET_NAMES[2]].sort());
    // Delete all
    await WalletService.deleteWallet(WALLET_NAMES[0]);
    await WalletService.deleteWallet(WALLET_NAMES[2]);
    wallets = await WalletService.listWallets();
    expect(wallets).toEqual([]);
  });

  it('should not be able to delete or load a non-existing wallet', async () => {
    (WalletService as any).KEYRING_FILE = TEST_KEYRING_FILE;

    // Try to delete a non-existent wallet
    const deleted = await WalletService.deleteWallet('nonexistent');
    expect(deleted).toBe(false);
    // Try to load a non-existent wallet
    await expect(WalletService.loadWallet('nonexistent')).rejects.toThrow('Wallet Not Found');
  });
});

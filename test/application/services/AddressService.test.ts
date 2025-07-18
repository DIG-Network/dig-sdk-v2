import { WalletService } from '../../../src/application/services/WalletService';
import { Wallet } from '../../../src/application/types/Wallet';
import fs from 'fs-extra';
import path from 'path';
import { getDataSource } from '../../../src/infrastructure/DatabaseProvider';
import { Address } from '../../../src/application/entities/Address';

const ADDRESS_NAMES = ['address1', 'address2', 'address3'];

// Helper to clean up all addresses before each test
async function cleanupAddresses() {
  const addresses = await WalletService.getWallets();
  for (const a of addresses) {
    if (a.name) await WalletService.deleteWallet(a.name);
    if (a.address) await WalletService.deleteWallet(a.address);
  }
}

describe('AddressService Integration', () => {
  beforeEach(async () => {
    const ds = await getDataSource();
    await ds.getRepository(Address).clear();
    await cleanupAddresses();
    const keyringPath = path.resolve('.dig/keyring.json');
    if (await fs.pathExists(keyringPath)) {
      await fs.remove(keyringPath);
    }
  });

  afterEach(async () => {
    const ds = await getDataSource();
    await ds.getRepository(Address).clear();
  });

  it('should create, load, and delete an address, and verify Wallet functionality', async () => {
    // Create a new wallet
    const address = await WalletService.createWallet(ADDRESS_NAMES[0]);
    expect(address).toBeInstanceOf(Wallet);
    const mnemonic = address.getMnemonic();
    expect(typeof mnemonic).toBe('string');
    expect(mnemonic.split(' ').length).toBeGreaterThanOrEqual(12);

    // Load the wallet
    const loadedAddress = await WalletService.loadWallet(ADDRESS_NAMES[0]);
    expect(loadedAddress).toBeInstanceOf(Wallet);
    expect(loadedAddress.getMnemonic()).toBe(mnemonic);

    // Wallet class: getMasterSecretKey returns a Buffer
    const masterSecretKey = await loadedAddress.getMasterSecretKey();
    expect(Buffer.isBuffer(masterSecretKey)).toBe(true);
    expect(masterSecretKey.length).toBeGreaterThan(0);

    // Wallet class: getPublicSyntheticKey returns a Buffer
    const publicSyntheticKey = await loadedAddress.getPublicSyntheticKey();
    expect(Buffer.isBuffer(publicSyntheticKey)).toBe(true);

    // Wallet class: getPrivateSyntheticKey returns a Buffer
    const privateSyntheticKey = await loadedAddress.getPrivateSyntheticKey();
    expect(Buffer.isBuffer(privateSyntheticKey)).toBe(true);

    // Wallet class: getPuzzleHash returns a Buffer
    const ownerPuzzleHash = await loadedAddress.getPuzzleHash();
    expect(Buffer.isBuffer(ownerPuzzleHash)).toBe(true);

    // Wallet class: getOwnerPublicKey returns a string
    const ownerPublicKey = await loadedAddress.getOwnerPublicKey();
    expect(typeof ownerPublicKey).toBe('string');
    expect(ownerPublicKey.length).toBeGreaterThan(0);

    // Wallet class: createKeyOwnershipSignature returns a string
    const signature = await loadedAddress.createKeyOwnershipSignature('nonce123');
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);

    // Delete the wallet
    const deleted = await WalletService.deleteWallet(ADDRESS_NAMES[0]);
    expect(deleted).toBe(true);
    await expect(WalletService.loadWallet(ADDRESS_NAMES[0])).rejects.toThrow('Address Not Found');
  });

  it('should return empty array if no addresses exist', async () => {
    const addresses = await WalletService.getWallets();
    expect(addresses).toEqual([]);
  });

  it('should list addresses after multiple creates and deletes', async () => {
    const createdAddresses: string[] = [];
    for (const name of ADDRESS_NAMES) {
      const address = await WalletService.createWallet(name);
      createdAddresses.push(await address.getOwnerPublicKey());
    }
    let addresses = await WalletService.getWallets();
    let addressList = addresses.map((a: any) => a.address);
    // All created addresses should be present (by count)
    expect(addressList.length).toBe(createdAddresses.length);
    // Delete one wallet
    await WalletService.deleteWallet(ADDRESS_NAMES[1]);
    addresses = await WalletService.getWallets();
    addressList = addresses.map((a: any) => a.address);
    // The deleted wallet's address should not be present
    expect(addressList).not.toContain(createdAddresses[1]);
    // The other two should still be present (by count)
    expect(addressList.length).toBe(createdAddresses.length - 1);
    // Delete all
    await WalletService.deleteWallet(ADDRESS_NAMES[0]);
    await WalletService.deleteWallet(ADDRESS_NAMES[2]);
    // Wait for deletions to propagate
    for (let i = 0; i < 5; i++) {
      addresses = await WalletService.getWallets();
      if (addresses.length === 0) break;
      await new Promise(res => setTimeout(res, 100));
    }
    expect(addresses).toEqual([]);
  });

  it('should not be able to delete or load a non-existing wallet', async () => {
    const deleted = await WalletService.deleteWallet('nonexistent');
    expect(deleted).toBe(false);
    // Try to load a non-existent wallet
    await expect(WalletService.loadWallet('nonexistent')).rejects.toThrow('Address Not Found');
  });

  it('should throw if a wallet with the same name already exists in the keyring', async () => {
    await WalletService.createWallet('duplicate');
    await expect(WalletService.createWallet('duplicate')).rejects.toThrow('Address with the same name already exists.');
  });

  it('should allow creating different addresses even if keyring file exists', async () => {
    await WalletService.createWallet('walletA');
    // The keyring file now exists, but a different wallet name should succeed
    const walletB = await WalletService.createWallet('walletB');
    expect(walletB).toBeInstanceOf(Wallet);
  });

  it('should return false when deleting a wallet that does not exist but keyring file exists', async () => {
    await WalletService.createWallet('walletX');
    const deleted = await WalletService.deleteWallet('nonexistent2');
    expect(deleted).toBe(false);
  });

  it('should throw Address Not Found if keyring file exists but wallet name does not', async () => {
    await WalletService.createWallet('walletY');
    await expect(WalletService.loadWallet('notthere')).rejects.toThrow('Address Not Found');
  });

  it('should store and load the exact mnemonic if provided', async () => {
    const mnemonic = 'test test test test test test test test test test test about';
    await WalletService.createWallet('mnemonicTest', mnemonic);
    const loaded = await WalletService.loadWallet('mnemonicTest');
    expect(loaded.getMnemonic()).toBe(mnemonic);
  });

  it('should return empty array after deleting all addresses', async () => {
    await WalletService.createWallet('del1');
    await WalletService.createWallet('del2');
    await WalletService.deleteWallet('del1');
    await WalletService.deleteWallet('del2');
    // Wait for deletions to propagate
    let addresses;
    for (let i = 0; i < 5; i++) {
      addresses = await WalletService.getWallets();
      if (addresses.length === 0) break;
      await new Promise(res => setTimeout(res, 100));
    }
    expect(addresses).toEqual([]);
  });
});

import { AddressService } from '../../../src/application/services/AddressService';
import { Wallet } from '../../../src/application/types/Wallet';
import fs from 'fs-extra';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const ADDRESS_NAMES = ['address1', 'address2', 'address3'];

// Helper to clean up all addresses before each test
async function cleanupAddresses() {
  const addresses = await AddressService.getAddresses();
  for (const a of addresses) {
    if (a.name) await AddressService.deleteAddress(a.name);
    if (a.address) await AddressService.deleteAddress(a.address);
  }
}

describe('AddressService Integration', () => {
  beforeEach(async () => {
    const prisma = new PrismaClient();
    await prisma.address.deleteMany();
    await cleanupAddresses();
    const keyringPath = path.resolve('.dig/keyring.json');
    if (await fs.pathExists(keyringPath)) {
      await fs.remove(keyringPath);
    }
  });

  afterEach(async () => {
    const prisma = new PrismaClient();
    await prisma.address.deleteMany();
  });

  it('should create, load, and delete an address, and verify Wallet functionality', async () => {
    // Create a new wallet
    const address = await AddressService.createAddress(ADDRESS_NAMES[0]);
    expect(address).toBeInstanceOf(Wallet);
    const mnemonic = address.getMnemonic();
    expect(typeof mnemonic).toBe('string');
    expect(mnemonic.split(' ').length).toBeGreaterThanOrEqual(12);

    // Load the wallet
    const loadedAddress = await AddressService.loadAddress(ADDRESS_NAMES[0]);
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
    const deleted = await AddressService.deleteAddress(ADDRESS_NAMES[0]);
    expect(deleted).toBe(true);
    await expect(AddressService.loadAddress(ADDRESS_NAMES[0])).rejects.toThrow('Address Not Found');
  });

  it('should return empty array if no addresses exist', async () => {
    const addresses = await AddressService.getAddresses();
    expect(addresses).toEqual([]);
  });

  it('should list addresses after multiple creates and deletes', async () => {
    const createdAddresses: string[] = [];
    for (const name of ADDRESS_NAMES) {
      const address = await AddressService.createAddress(name);
      createdAddresses.push(await address.getOwnerPublicKey());
    }
    let addresses = await AddressService.getAddresses();
    let addressList = addresses.map((a: any) => a.address);
    // All created addresses should be present (by count)
    expect(addressList.length).toBe(createdAddresses.length);
    // Delete one wallet
    await AddressService.deleteAddress(ADDRESS_NAMES[1]);
    addresses = await AddressService.getAddresses();
    addressList = addresses.map((a: any) => a.address);
    // The deleted wallet's address should not be present
    expect(addressList).not.toContain(createdAddresses[1]);
    // The other two should still be present (by count)
    expect(addressList.length).toBe(createdAddresses.length - 1);
    // Delete all
    await AddressService.deleteAddress(ADDRESS_NAMES[0]);
    await AddressService.deleteAddress(ADDRESS_NAMES[2]);
    // Wait for deletions to propagate
    for (let i = 0; i < 5; i++) {
      addresses = await AddressService.getAddresses();
      if (addresses.length === 0) break;
      await new Promise(res => setTimeout(res, 100));
    }
    expect(addresses).toEqual([]);
  });

  it('should not be able to delete or load a non-existing wallet', async () => {
    const deleted = await AddressService.deleteAddress('nonexistent');
    expect(deleted).toBe(false);
    // Try to load a non-existent wallet
    await expect(AddressService.loadAddress('nonexistent')).rejects.toThrow('Address Not Found');
  });

  it('should throw if a wallet with the same name already exists in the keyring', async () => {
    await AddressService.createAddress('duplicate');
    await expect(AddressService.createAddress('duplicate')).rejects.toThrow('Address with the same name already exists.');
  });

  it('should allow creating different wallets even if keyring file exists', async () => {
    await AddressService.createAddress('walletA');
    // The keyring file now exists, but a different wallet name should succeed
    const walletB = await AddressService.createAddress('walletB');
    expect(walletB).toBeInstanceOf(Wallet);
  });

  describe('calculateFeeForCoinSpends', () => {
    it('should return the default fee, but fail if not changed after 1 year', async () => {
      const now = new Date();
      const cutoff = new Date('2026-06-24T00:00:00Z'); // 1 year from today
      if (now >= cutoff) {
        throw new Error('calculateFeeForCoinSpends must be reviewed and updated after 1 year!');
      }
      const fee = await AddressService.prototype.calculateFeeForCoinSpends.call(new AddressService());
      expect(fee).toBe(BigInt(1000000));
    });
  });

  it('should return false when deleting a wallet that does not exist but keyring file exists', async () => {
    await AddressService.createAddress('walletX');
    const deleted = await AddressService.deleteAddress('nonexistent2');
    expect(deleted).toBe(false);
  });

  it('should throw Address Not Found if keyring file exists but wallet name does not', async () => {
    await AddressService.createAddress('walletY');
    await expect(AddressService.loadAddress('notthere')).rejects.toThrow('Address Not Found');
  });

  it('should store and load the exact mnemonic if provided', async () => {
    const mnemonic = 'test test test test test test test test test test test about';
    await AddressService.createAddress('mnemonicTest', mnemonic);
    const loaded = await AddressService.loadAddress('mnemonicTest');
    expect(loaded.getMnemonic()).toBe(mnemonic);
  });

  it('should return empty array after deleting all wallets', async () => {
    await AddressService.createAddress('del1');
    await AddressService.createAddress('del2');
    await AddressService.deleteAddress('del1');
    await AddressService.deleteAddress('del2');
    // Wait for deletions to propagate
    let addresses;
    for (let i = 0; i < 5; i++) {
      addresses = await AddressService.getAddresses();
      if (addresses.length === 0) break;
      await new Promise(res => setTimeout(res, 100));
    }
    expect(addresses).toEqual([]);
  });
});

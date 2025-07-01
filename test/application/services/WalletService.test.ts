import { WalletService } from '../../../src/application/services/WalletService';
import { Wallet } from '../../../src/application/types/Wallet';
import { TestBlockchainService } from '../../../src/infrastructure/BlockchainServices/TestBlockchainService';

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
    // await cleanupWallets();
    walletService = new WalletService(":memory:");
  });

  it('should create, load, and delete a wallet, and verify Wallet functionality', async () => {
    // Create a new wallet
    const wallet = await walletService.createNewWallet(WALLET_NAMES[0]);
    expect(wallet).toBeInstanceOf(Wallet);
    const mnemonic = wallet.getMnemonic();
    expect(typeof mnemonic).toBe('string');
    expect(mnemonic.split(' ').length).toBeGreaterThanOrEqual(12);

    // Load the wallet
    const loadedWallet = await walletService.loadWallet(WALLET_NAMES[0]);
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
    const deleted = await walletService.deleteWallet(WALLET_NAMES[0]);
    expect(deleted).toBe(true);
    await expect(walletService.loadWallet(WALLET_NAMES[0])).rejects.toThrow('Wallet Not Found');
  });

  it('should return empty array if no wallets exist', async () => {
    const wallets = await walletService.listWallets();
    expect(wallets).toEqual([]);
  });

  it('should list wallets after multiple creates and deletes', async () => {
    const createdAddresses: string[] = [];
    for (const name of WALLET_NAMES) {
      const wallet = await walletService.createNewWallet(name);
      createdAddresses.push(await wallet.getOwnerPublicKey());
    }
    let wallets = await walletService.listWallets();
    let walletAddresses = wallets.map((w: any) => w.address);
    // All created addresses should be present
    for (const addr of createdAddresses) {
      expect(walletAddresses).toContain(addr);
    }
    // Delete one wallet
    await walletService.deleteWallet(WALLET_NAMES[1]);
    wallets = await walletService.listWallets();
    walletAddresses = wallets.map((w: any) => w.address);
    // The deleted wallet's address should not be present
    expect(walletAddresses).not.toContain(createdAddresses[1]);
    // The other two should still be present
    expect(walletAddresses).toContain(createdAddresses[0]);
    expect(walletAddresses).toContain(createdAddresses[2]);
    // Delete all
    await walletService.deleteWallet(WALLET_NAMES[0]);
    await walletService.deleteWallet(WALLET_NAMES[2]);
    wallets = await walletService.listWallets();
    expect(wallets).toEqual([]);
  });

  it('should not be able to delete or load a non-existing wallet', async () => {
    const deleted = await walletService.deleteWallet('nonexistent');
    expect(deleted).toBe(false);
    // Try to load a non-existent wallet
    await expect(walletService.loadWallet('nonexistent')).rejects.toThrow('Wallet Not Found');
  });

  describe('isCoinSpendable', () => {
    const coinId = Buffer.from('aabbcc', 'hex');
    let peer: any;

    beforeEach(() => {
      peer = {
        isCoinSpent: jest.fn(),
      };
      (walletService as any).blockchain.isCoinSpendable = jest.fn();
    });

    it('should return true if blockchain.isCoinSpendable resolves true', async () => {
      (walletService as any).blockchain.isCoinSpendable = jest.fn().mockResolvedValue(true);
      const result = await walletService.isCoinSpendable(peer, coinId, 0, '00'.repeat(32));
      expect(result).toBe(true);
      expect((walletService as any).blockchain.isCoinSpendable).toHaveBeenCalledWith(peer, coinId, 0, expect.any(Buffer));
    });

    it('should return false if blockchain.isCoinSpendable resolves false', async () => {
      (walletService as any).blockchain.isCoinSpendable = jest.fn().mockResolvedValue(false);
      const result = await walletService.isCoinSpendable(peer, coinId, 0, '00'.repeat(32));
      expect(result).toBe(false);
    });

    it('should return false if blockchain.isCoinSpendable throws', async () => {
      (walletService as any).blockchain.isCoinSpendable = jest.fn().mockRejectedValue(new Error('fail'));
      const result = await walletService.isCoinSpendable(peer, coinId, 0, '00'.repeat(32));
      expect(result).toBe(false);
    });
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

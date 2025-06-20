import { WalletService } from '../../../src/application/services/WalletService';
import { Wallet } from '../../../src/application/types/Wallet';

const WALLET_NAMES = ['wallet1', 'wallet2', 'wallet3'];

describe('WalletService Integration', () => {
  it('should create, load, and delete a wallet, and verify Wallet functionality', async () => {
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
    const wallets = await WalletService.listWallets();
    expect(wallets).toEqual([]);
  });

  it('should list wallets after multiple creates and deletes', async () => {
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
    const deleted = await WalletService.deleteWallet('nonexistent');
    expect(deleted).toBe(false);
    // Try to load a non-existent wallet
    await expect(WalletService.loadWallet('nonexistent')).rejects.toThrow('Wallet Not Found');
  });

  describe('isCoinSpendable', () => {
    const coinId = Buffer.from('aabbcc', 'hex');
    let peer: any;

    beforeEach(() => {
      peer = {
        isCoinSpent: jest.fn(),
      };
    });

    it('should return true if peer.isCoinSpent resolves true', async () => {
      peer.isCoinSpent.mockResolvedValue(true);
      const result = await WalletService.isCoinSpendable(peer, coinId);
      expect(result).toBe(true);
      expect(peer.isCoinSpent).toHaveBeenCalledWith(coinId, expect.any(Number), expect.any(Buffer));
    });

    it('should return false if peer.isCoinSpent resolves false', async () => {
      peer.isCoinSpent.mockResolvedValue(false);
      const result = await WalletService.isCoinSpendable(peer, coinId);
      expect(result).toBe(false);
    });

    it('should return false if peer.isCoinSpent throws', async () => {
      peer.isCoinSpent.mockRejectedValue(new Error('fail'));
      const result = await WalletService.isCoinSpendable(peer, coinId);
      expect(result).toBe(false);
    });
  });
});

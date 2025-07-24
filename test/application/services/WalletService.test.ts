import { WalletService, WalletType } from '../../../src/application/services/WalletService';
import { Wallet } from '../../../src/application/types/Wallet';
import { ColdWallet } from '../../../src/application/types/ColdWallet';

describe('WalletService wallet type selection', () => {
  const TEST_MNEMONIC = 'test test test test test test test test test test test ball';
  const TEST_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8249j';
  const TEST_COLD_ADDRESS = 'xch1coldaddressxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  beforeEach(async () => {
    // Clean up any test wallets
    try { await WalletService.deleteWallet('test_wallet'); } catch {}
    try { await WalletService.deleteWallet('test_cold'); } catch {}
  });

  it('should create and load a Wallet instance', async () => {
    const wallet = await WalletService.createWallet('test_wallet', TEST_MNEMONIC);
    expect(wallet).toBeInstanceOf(Wallet);
    const loaded = await WalletService.loadWallet('test_wallet');
    expect(loaded).toBeInstanceOf(Wallet);
    expect((loaded as Wallet).getMnemonic()).toBe(TEST_MNEMONIC);
  });

  it('should create and load a ColdWallet instance', async () => {
    const cold = await WalletService.createColdWallet('test_cold', TEST_COLD_ADDRESS);
    expect(cold).toBeInstanceOf(ColdWallet);
    const loaded = await WalletService.loadWallet('test_cold');
    expect(loaded).toBeInstanceOf(ColdWallet);
  });

  it('should throw when loading a non-existent wallet', async () => {
    await expect(WalletService.loadWallet('does_not_exist')).rejects.toThrow('Address Not Found');
  });

  it('should throw when creating a duplicate wallet', async () => {
    await WalletService.createWallet('test_wallet', TEST_MNEMONIC);
    await expect(WalletService.createWallet('test_wallet', TEST_MNEMONIC)).rejects.toThrow('Address with the same name already exists.');
  });
});

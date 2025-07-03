import Database from 'better-sqlite3';
import { WalletRepository } from '../../../src/application/repositories/WalletRepository';
import { IWalletRepository } from '../../../src/application/repositories/Interfaces/IWalletRepository';

describe('WalletRepository', () => {
  const dbPath = ':memory:';
  let db: Database.Database;
  let walletRepo: IWalletRepository;

  beforeEach(() => {
    db = new Database(dbPath);
    walletRepo = new WalletRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should add and retrieve wallets', () => {
    walletRepo.addWallet('xch1234', 'name');
    const wallets = walletRepo.getWallets();
    expect(wallets.length).toBe(1);
    expect(wallets[0].address).toBe('xch1234');
    expect(wallets[0].namespace).toBe('default');
  });

  it('should add a wallet with a custom namespace', () => {
    walletRepo.addWallet('xch5678', 'name', 'customns');
    const wallets = walletRepo.getWallets();
    expect(wallets.length).toBe(1);
    expect(wallets[0].address).toBe('xch5678');
    expect(wallets[0].namespace).toBe('customns');
  });

  it('should update wallet sync state', () => {
    walletRepo.addWallet('xch1234', 'name');
    walletRepo.updateWalletSync('xch1234', 42, 'abc');
    const wallets = walletRepo.getWallets();
    expect(wallets[0].synced_to_height).toBe(42);
    expect(wallets[0].synced_to_hash).toBe('abc');
  });

  it('should not add duplicate wallets', () => {
    walletRepo.addWallet('xch1234', 'name');
    expect(() => walletRepo.addWallet('xch1234', 'name')).toThrow('Wallet with this name already exists');
  });
});

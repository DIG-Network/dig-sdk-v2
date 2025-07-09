import Database from 'better-sqlite3';
import { IWalletRepository } from '../../../src/application/repositories/Interfaces/IWalletRepository';
import { WALLET_DB_FILE, WalletRepository } from '../../../src/application/repositories/WalletRepository';

describe('WalletRepository', () => {
  let db: Database.Database;
  let walletRepo: IWalletRepository;

  beforeAll(() => {
    db = new Database(WALLET_DB_FILE);
    db.prepare('DELETE FROM wallet').run();
    db.close();
  });

  beforeEach(() => {
    walletRepo = new WalletRepository();
  });

  afterEach(() => {
    db = new Database(WALLET_DB_FILE);
    db.prepare('DELETE FROM wallet').run();
    db.close();
  });

  it('should add and retrieve wallets', () => {
    walletRepo.addAddress('xch1234', 'name');
    const wallets = walletRepo.getAddresses();
    expect(wallets.length).toBe(1);
    expect(wallets[0].address).toBe('xch1234');
    expect(wallets[0].namespace).toBe('default');
  });

  it('should add a wallet with a custom namespace', () => {
    walletRepo.addAddress('xch5678', 'name', 'customns');
    const wallets = walletRepo.getAddresses();
    expect(wallets.length).toBe(1);
    expect(wallets[0].address).toBe('xch5678');
    expect(wallets[0].namespace).toBe('customns');
  });

  it('should update wallet sync state', () => {
    walletRepo.addAddress('xch1234', 'name');
    walletRepo.updateWalletSync('xch1234', 42, 'abc');
    const wallets = walletRepo.getAddresses();
    expect(wallets[0].synced_to_height).toBe(42);
    expect(wallets[0].synced_to_hash).toBe('abc');
  });

  it('should not add duplicate wallets', () => {
    walletRepo.addAddress('xch1234', 'name');
    expect(() => walletRepo.addAddress('xch1234', 'name')).toThrow('Wallet with this name already exists');
  });

  it('should return undefined when getting a wallet that does not exist', () => {
    const repo = new WalletRepository();
    const wallets = repo.getAddresses();
    expect(wallets.find(w => w.name === 'notfound')).toBeUndefined();
  });

  it('should not throw when removing a wallet that does not exist', () => {
    const repo = new WalletRepository();
    expect(() => repo.removeAddressByName('notfound')).not.toThrow();
  });
});

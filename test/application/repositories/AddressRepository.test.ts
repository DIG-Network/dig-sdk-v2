import { AddressRepository, IAddressRepository } from "../../../src/application/repositories/AddressRepository";

describe('WalletRepository', () => {
  let walletRepo: IAddressRepository;

  beforeEach(() => {
    walletRepo = new AddressRepository();
  });

  afterEach(async () => {
    // Clean up all wallets after each test
    const wallets = await walletRepo.getAddresses();
    for (const w of wallets) {
      await walletRepo.removeAddress(w.address);
    }
  });

  it('should add and retrieve wallets', async () => {
    await walletRepo.addAddress('xch1234', 'name');
    const wallets = await walletRepo.getAddresses();
    expect(wallets.length).toBe(1);
    expect(wallets[0].address).toBe('xch1234');
    expect(wallets[0].namespace).toBe('default');
  });

  it('should add a wallet with a custom namespace', async () => {
    await walletRepo.addAddress('xch5678', 'name', 'customns');
    const wallets = await walletRepo.getAddresses();
    expect(wallets.length).toBe(1);
    expect(wallets[0].address).toBe('xch5678');
    expect(wallets[0].namespace).toBe('customns');
  });

  it('should update wallet sync state', async () => {
    await walletRepo.addAddress('xch1234', 'name');
    await walletRepo.updateAddressSync('xch1234', 42, 'abc');
    const wallets = await walletRepo.getAddresses();
    expect(wallets[0].synced_to_height).toBe(42);
    expect(wallets[0].synced_to_hash).toBe('abc');
  });

  it('should not add duplicate wallets', async () => {
    await walletRepo.addAddress('xch1234', 'name');
    await expect(walletRepo.addAddress('xch1234', 'name')).rejects.toThrow('Address with this name already exists');
  });

  it('should return undefined when getting a wallet that does not exist', async () => {
    const repo = new AddressRepository();
    const wallets = await repo.getAddresses();
    expect(wallets.find(w => w.name === 'notfound')).toBeUndefined();
  });

  it('should not throw when removing a wallet that does not exist', async () => {
    const repo = new AddressRepository();
    await expect(repo.removeAddressByName('notfound')).resolves.not.toThrow();
  });
});

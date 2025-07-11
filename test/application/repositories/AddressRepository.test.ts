import { AddressRepository, IAddressRepository } from "../../../src/application/repositories/AddressRepository";

describe('addressRepository', () => {
  let addressRepo: IAddressRepository;

  beforeEach(() => {
    addressRepo = new AddressRepository();
  });

  afterEach(async () => {
    // Clean up all addresses after each test
    const addresses = await addressRepo.getAddresses();
    for (const w of addresses) {
      await addressRepo.removeAddress(w.address);
    }
  });

  it('should add and retrieve addresses', async () => {
    await addressRepo.addAddress('xch1234', 'name');
    const addresses = await addressRepo.getAddresses();
    expect(addresses.length).toBe(1);
    expect(addresses[0].address).toBe('xch1234');
    expect(addresses[0].namespace).toBe('default');
  });

  it('should add a wallet with a custom namespace', async () => {
    await addressRepo.addAddress('xch5678', 'name', 'customns');
    const addresses = await addressRepo.getAddresses();
    expect(addresses.length).toBe(1);
    expect(addresses[0].address).toBe('xch5678');
    expect(addresses[0].namespace).toBe('customns');
  });

  it('should update wallet sync state', async () => {
    await addressRepo.addAddress('xch1234', 'name');
    await addressRepo.updateAddressSync('xch1234', 42, 'abc');
    const addresses = await addressRepo.getAddresses();
    expect(addresses[0].synced_to_height).toBe(42);
    expect(addresses[0].synced_to_hash).toBe('abc');
  });

  it('should not add duplicate addresses', async () => {
    await addressRepo.addAddress('xch1234', 'name');
    await expect(addressRepo.addAddress('xch1234', 'name')).rejects.toThrow('Address with this name already exists');
  });

  it('should return undefined when getting a wallet that does not exist', async () => {
    const repo = new AddressRepository();
    const addresses = await repo.getAddresses();
    expect(addresses.find(w => w.name === 'notfound')).toBeUndefined();
  });

  it('should not throw when removing a wallet that does not exist', async () => {
    const repo = new AddressRepository();
    await expect(repo.removeAddressByName('notfound')).resolves.not.toThrow();
  });
});

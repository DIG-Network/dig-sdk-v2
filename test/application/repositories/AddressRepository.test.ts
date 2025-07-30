
import { AddressRepository, IAddressRepository } from '../../../src/application/repositories/AddressRepository';
import { DataSource } from 'typeorm';
import { Address } from '../../../src/application/entities/Address';
import * as DatabaseProvider from '../../../src/infrastructure/DatabaseProvider';
import betterSqlite3 from 'better-sqlite3';

describe('addressRepository', () => {
  let addressRepo: IAddressRepository;
  let dataSource: DataSource;
  let getDataSourceSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Create a new in-memory TypeORM DataSource using better-sqlite3
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [Address],
      synchronize: true,
      // Use a unique name for each connection to avoid collisions
      name: `test-${Math.random()}`,
      // Use the already installed better-sqlite3 driver
      driver: betterSqlite3,
    } as any);
    await dataSource.initialize();
    // Mock getDataSource to always return this in-memory DataSource
    getDataSourceSpy = jest.spyOn(DatabaseProvider, 'getDataSource').mockResolvedValue(dataSource);
    addressRepo = new AddressRepository();
  });

  afterEach(async () => {
    getDataSourceSpy.mockRestore();
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
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
    expect(addresses[0].syncedToHeight).toBe(42);
    expect(addresses[0].syncedToHash).toBe('abc');
  });

  it('should not add duplicate addresses', async () => {
    await addressRepo.addAddress('xch1234', 'name');
    await expect(addressRepo.addAddress('xch1234', 'name')).rejects.toThrow(
      'Address with the same name already exists.',
    );
  });

  it('should return undefined when getting a wallet that does not exist', async () => {
    const repo = new AddressRepository();
    const addresses = await repo.getAddresses();
    expect(addresses.find((w) => w.name === 'notfound')).toBeUndefined();
  });

  it('should not throw when removing a wallet that does not exist', async () => {
    const repo = new AddressRepository();
    await expect(repo.removeAddressByName('notfound')).resolves.not.toThrow();
  });
});

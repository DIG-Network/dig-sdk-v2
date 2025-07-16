import { getDataSource } from '../../infrastructure/DatabaseProvider';
import { Address } from '../../infrastructure/entities/Address';

export interface AddressRow {
  address: string;
  namespace: string;
  synced_to_height: number;
  synced_to_hash: string;
  name?: string;
}

export interface IAddressRepository {
  addAddress(address: string, name: string, namespace?: string): Promise<void>;
  updateAddressSync(address: string, synced_to_height: number, synced_to_hash: string): Promise<void>;
  removeAddress(address: string): Promise<void>;
  removeAddressByName(name: string): Promise<void>;
  getAddresses(): Promise<AddressRow[]>;
}

export class AddressRepository implements IAddressRepository {
  async addAddress(address: string, name: string, namespace: string = 'default', synchedToHeight: number = 0, synchedToHash: string = '') {
    const ds = await getDataSource();
    const repo = ds.getRepository(Address);
    const exists = await repo.findOne({ where: { name } });
    if (exists) throw new Error('Address with this name already exists');
    const addr = repo.create({ address, namespace, name, synced_to_height: synchedToHeight, synced_to_hash: synchedToHash });
    await repo.save(addr);
  }

  async updateAddressSync(address: string, synced_to_height: number, synced_to_hash: string) {
    const ds = await getDataSource();
    const repo = ds.getRepository(Address);
    await repo.update({ address }, { synced_to_height, synced_to_hash });
  }

  async removeAddress(address: string) {
    const ds = await getDataSource();
    const repo = ds.getRepository(Address);
    await repo.delete({ address });
  }

  async removeAddressByName(name: string) {
    const ds = await getDataSource();
    const repo = ds.getRepository(Address);
    await repo.delete({ name });
  }

  async getAddresses(): Promise<AddressRow[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Address);
    return repo.find();
  }
}

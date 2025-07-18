import { getDataSource } from '../../infrastructure/DatabaseProvider';
import { Address } from '../entities/Address';

export interface IAddressRepository {
  addAddress(address: string, name: string, namespace?: string): Promise<void>;
  updateAddressSync(address: string, syncedToHeight: number, syncedToHash: string): Promise<void>;
  removeAddress(address: string): Promise<void>;
  removeAddressByName(name: string): Promise<void>;
  getAddresses(): Promise<Address[]>;
}

export class AddressRepository implements IAddressRepository {
  async addAddress(address: string, name: string, namespace: string = 'default', synchedToHeight: number = 0, synchedToHash: string = '') {
    const ds = await getDataSource();
    const repo = ds.getRepository(Address);
    const exists = await repo.findOne({ where: { name } });
    if (exists) throw new Error('Address with this name already exists');
    const addr = repo.create({ address, namespace, name, syncedToHeight: synchedToHeight, syncedToHash: synchedToHash });
    await repo.save(addr);
  }

  async updateAddressSync(address: string, syncedToHeight: number, syncedToHash: string) {
    const ds = await getDataSource();
    const repo = ds.getRepository(Address);
    await repo.update({ address }, { syncedToHeight, syncedToHash });
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

  async getAddresses(): Promise<Address[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Address);
    return repo.find();
  }
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    // Prevent duplicate names
    const exists = await prisma.address.findUnique({ where: { name } });
    if (exists) throw new Error('Address with this name already exists');
    await prisma.address.create({
      data: {
        address,
        namespace,
        name,
        synced_to_height: synchedToHeight,
        synced_to_hash: synchedToHash,
      },
    });
  }

  async updateAddressSync(address: string, synced_to_height: number, synced_to_hash: string) {
    await prisma.address.update({
      where: { address },
      data: { synced_to_height, synced_to_hash },
    });
  }

  async removeAddress(address: string) {
    await prisma.address.deleteMany({ where: { address } });
  }

  async removeAddressByName(name: string) {
    await prisma.address.deleteMany({ where: { name } });
  }

  async getAddresses(): Promise<AddressRow[]> {
    return prisma.address.findMany();
  }
}

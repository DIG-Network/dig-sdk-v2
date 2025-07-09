import { PrismaClient } from '@prisma/client';
import { IWalletRepository } from './Interfaces/IWalletRepository';

const prisma = new PrismaClient();

export interface AddressRow {
  address: string;
  namespace: string;
  synced_to_height: number;
  synced_to_hash: string;
  name?: string;
}

export class WalletRepository implements IWalletRepository {
  async addAddress(address: string, name: string, namespace: string = 'default', synchedToHeight: number = 0, synchedToHash: string = '') {
    // Prevent duplicate names
    const exists = await prisma.wallet.findUnique({ where: { name } });
    if (exists) throw new Error('Wallet with this name already exists');
    await prisma.wallet.create({
      data: {
        address,
        namespace,
        name,
        synced_to_height: synchedToHeight,
        synced_to_hash: synchedToHash,
      },
    });
  }

  async updateWalletSync(address: string, synced_to_height: number, synced_to_hash: string) {
    await prisma.wallet.update({
      where: { address },
      data: { synced_to_height, synced_to_hash },
    });
  }

  async removeWallet(address: string) {
    await prisma.wallet.deleteMany({ where: { address } });
  }

  async removeAddressByName(name: string) {
    await prisma.wallet.deleteMany({ where: { name } });
  }

  async getAddresses(): Promise<AddressRow[]> {
    return prisma.wallet.findMany();
  }
}

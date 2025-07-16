import { getDatabaseProvider } from '../../infrastructure/DatabaseProvider';
import { Block } from '../types/Block';

const prisma = getDatabaseProvider().getPrismaClient();

export interface IBlockRepository {
  addBlock(height: number, headerHash: string): Promise<void>;
  getBlockById(height: number): Promise<Block | null>;
  getBlocks(): Promise<Block[]>;
}

export class BlockRepository implements IBlockRepository {
  async addBlock(height: number, headerHash: string): Promise<void> {
    await prisma.block.upsert({
      where: { height },
      update: { headerHash },
      create: { height, headerHash },
    });
  }

  async getBlockById(height: number): Promise<Block | null> {
    return await prisma.block.findUnique({ where: { height } });
  }

  async getBlocks(): Promise<Block[]> {
    return await prisma.block.findMany({ orderBy: { height: 'asc' } });
  }
}

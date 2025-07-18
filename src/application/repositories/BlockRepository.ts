import { getDatabaseProvider } from '../../infrastructure/DatabaseProvider';
import { Block } from '../types/Block';
import { IBlockRepository } from './Interfaces/IBlockRepository';

const prisma = getDatabaseProvider().getPrismaClient();

function toBlock(prismaBlock: { hash: Buffer | Uint8Array; blockHeight: number }): Block {
  // Prisma returns Uint8Array for Bytes, convert to Buffer if needed
  return {
    hash: Buffer.isBuffer(prismaBlock.hash) ? prismaBlock.hash : Buffer.from(prismaBlock.hash),
    blockHeight: prismaBlock.blockHeight,
  };
}

export class BlockRepository implements IBlockRepository {
  async getLatestBlock(): Promise<Block> {
    const block = await prisma.block.findFirst({
      orderBy: { blockHeight: 'desc' },
    });
    if (!block) throw new Error('No blocks found');
    return toBlock(block);
  }

  async getBlockByHeight(height: number): Promise<Block> {
    const block = await prisma.block.findUnique({
      where: { blockHeight: height },
    });
    if (!block) throw new Error(`Block with height ${height} not found`);
    return toBlock(block);
  }

  async addBlock(hash: Buffer, blockHeight: number) {
    return await prisma.block.create({ data: { hash, blockHeight } });
  }
}

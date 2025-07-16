import { getDataSource } from '../../infrastructure/DatabaseProvider';
import { Block } from '../../infrastructure/entities/Block';

export interface IBlockRepository {
  addBlock(height: number, headerHash: string): Promise<void>;
  getBlockById(height: number): Promise<Block | null>;
  getBlocks(): Promise<Block[]>;
}

export class BlockRepository implements IBlockRepository {
  async addBlock(height: number, headerHash: string): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Block);
    const existing = await repo.findOne({ where: { height } });
    if (existing) {
      await repo.update({ height }, { headerHash });
    } else {
      const block = repo.create({ height, headerHash });
      await repo.save(block);
    }
  }

  async getBlockById(height: number): Promise<Block | null> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Block);
    return await repo.findOne({ where: { height } });
  }

  async getBlocks(): Promise<Block[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Block);
    return await repo.find({ order: { height: 'ASC' } });
  }
}

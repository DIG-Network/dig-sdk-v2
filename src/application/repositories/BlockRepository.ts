import { EntityManager } from 'typeorm';
import { Block } from '../../infrastructure/entities/Block';
import { getDataSource } from '../../infrastructure/DatabaseProvider';

export interface IBlockRepository {
  addBlock(height: number, headerHash: string, weight: string, managerParam: EntityManager): Promise<void>;
  getBlockById(height: number, managerParam?: EntityManager): Promise<Block | null>;
  getBlocks(managerParam?: EntityManager): Promise<Block[]>;
}

export class BlockRepository implements IBlockRepository {
  async addBlock(height: number, headerHash: string, weight: string, managerParam: EntityManager): Promise<void> {
    const manager = managerParam || (await getDataSource()).manager;
    const repo = manager.getRepository(Block);
    const existing = await repo.findOne({ where: { height } });
    if (existing) {
      await repo.update({ height }, { headerHash, weight });
    } else {
      try{
        const block = repo.create({ height, headerHash, weight });
        await repo.save(block);
      } catch{
      }
    }
  }

  async getBlockById(height: number, managerParam?: EntityManager): Promise<Block | null> {
    const manager = managerParam || (await getDataSource()).manager;
    const repo = manager.getRepository(Block);
    return await repo.findOne({ where: { height } });
  }

  async getBlocks(managerParam?: EntityManager): Promise<Block[]> {
    const manager = managerParam || (await getDataSource()).manager;
    const repo = manager.getRepository(Block);
    return await repo.find({ order: { height: 'ASC' } });
  }
}

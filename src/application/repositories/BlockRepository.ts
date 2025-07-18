import { EntityManager } from 'typeorm';
import { getDataSource } from '../../infrastructure/DatabaseProvider';
import { Block } from '../entities/Block';

export interface IBlockRepository {
  addBlock(height: string, headerHash: Buffer, weight: string, managerParam: EntityManager): Promise<void>;
  getBlockById(height: string, managerParam?: EntityManager): Promise<Block | null>;
  getBlocks(managerParam?: EntityManager): Promise<Block[]>;
}

export class BlockRepository implements IBlockRepository {
  async addBlock(height: string, headerHash: Buffer, weight: string, managerParam: EntityManager): Promise<void> {
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

  async getBlockById(height: string, managerParam?: EntityManager): Promise<Block | null> {
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

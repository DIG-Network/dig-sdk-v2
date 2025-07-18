import { EntityManager } from 'typeorm';
import { getDataSource } from '../../infrastructure/DatabaseProvider';
import { Block } from '../entities/Block';

export interface IBlockRepository {
  addBlock(block: Block, managerParam: EntityManager): Promise<Block>;
  getBlockById(height: string, managerParam?: EntityManager): Promise<Block | null>;
  getBlocks(managerParam?: EntityManager): Promise<Block[]>;
}

export class BlockRepository implements IBlockRepository {
  async addBlock(block: Block, managerParam: EntityManager): Promise<Block> {
    const manager = managerParam || (await getDataSource()).manager;
    const repo = manager.getRepository(Block);

    try {
      const dbBlock = repo.create(block);
      const savedBlock = await repo.save(dbBlock);
      return savedBlock;
    } catch {
      return block;
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

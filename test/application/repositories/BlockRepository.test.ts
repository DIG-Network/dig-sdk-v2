import { BlockRepository } from '../../../src/application/repositories/BlockRepository';
import { Block } from '../../../src/application/entities/Block';
import { DataSource } from 'typeorm';

// Mock DatabaseProvider to use in-memory SQLite
jest.mock('../../../src/infrastructure/DatabaseProvider', () => {
  let dataSource: DataSource | null = null;
  return {
    getDataSource: async () => {
      if (dataSource && dataSource.isInitialized) return dataSource;
      dataSource = new DataSource({
        type: 'sqlite',
        database: ':memory:',
        entities: [require('../../../src/application/entities/Block').Block],
        synchronize: true,
      });
      await dataSource.initialize();
      return dataSource;
    },
  };
});

describe('BlockRepository', () => {
  let repo: BlockRepository;
  let block: Block;

  beforeEach(async () => {
    repo = new BlockRepository();
    block = new Block();
    block.height = '1';
    block.weight = '100';
    block.headerHash = Buffer.from('abc123', 'utf-8');
    block.timestamp = new Date();
  });

  it('should add and retrieve a block', async () => {
    await repo.addBlock(block);
    const found = await repo.getBlockById('1');
    expect(found).not.toBeNull();
    expect(found?.height).toBe(1);
    expect(found?.headerHash.toString('utf-8')).toBe('abc123');
  });

  it('should return null for non-existent block', async () => {
    const found = await repo.getBlockById('999');
    expect(found).toBeNull();
  });

  it('should return all blocks in order', async () => {
    const block2 = new Block();
    block2.height = '2';
    block2.weight = '200';
    block2.headerHash = Buffer.from('def456', 'utf-8');
    block2.timestamp = new Date();
    await repo.addBlock(block);
    await repo.addBlock(block2);
    const blocks = await repo.getBlocks();
    expect(blocks.length).toBe(2);
    expect(blocks[0].height).toBe(1);
    expect(blocks[1].height).toBe(2);
  });

  it('should return the input block if save fails', async () => {
    // Patch repo.save to throw
    const ds = await (await import('../../../src/infrastructure/DatabaseProvider')).getDataSource();
    const origSave = ds.getRepository(Block).save;
    ds.getRepository(Block).save = jest.fn().mockRejectedValue(new Error('fail'));
    const result = await repo.addBlock(block);
    expect(result).toBe(block);
    ds.getRepository(Block).save = origSave;
  });
});

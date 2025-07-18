import { BlockRepository } from '../../../src/application/repositories/BlockRepository';
import { IBlockRepository } from '../../../src/application/repositories/Interfaces/IBlockRepository';

describe('BlockRepository', () => {
  let repo: IBlockRepository;

  beforeEach(async () => {
    // Truncate Block table for test isolation
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.block.deleteMany();
    repo = new BlockRepository();
  });

  afterEach(async () => {
    // Truncate Block table for test isolation
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.block.deleteMany();
  });

  it('getLatestBlock returns the latest block, throws if none', async () => {
    repo = new BlockRepository();
    await expect(repo.getLatestBlock()).rejects.toThrow('No blocks found');
    // Add a helper to BlockRepository for test use only
    await (repo as any).addBlock(Buffer.from('a1'.padEnd(64, 'a'), 'hex'), 1);
    await (repo as any).addBlock(Buffer.from('b2'.padEnd(64, 'b'), 'hex'), 2);
    const latest = await repo.getLatestBlock();
    expect(latest.blockHeight).toBe(2);
    expect(typeof latest.hash).toBe('object');
    expect(latest.hash.toString('hex')).toBe('b2'.padEnd(64, 'b'));
  });

  it('getBlockByHeight returns correct block, throws if not found', async () => {
    // Only test retrieval after insertion
    await (repo as any).addBlock(Buffer.from('d4'.padEnd(64, 'd'), 'hex'), 4);
    await (repo as any).addBlock(Buffer.from('e5'.padEnd(64, 'e'), 'hex'), 5);
    const block4 = await repo.getBlockByHeight(4);
    expect(block4.blockHeight).toBe(4);
    expect(typeof block4.hash).toBe('object');
    expect(block4.hash.toString('hex')).toBe('d4'.padEnd(64, 'd'));
    const block5 = await repo.getBlockByHeight(5);
    expect(block5.blockHeight).toBe(5);
    expect(typeof block5.hash).toBe('object');
    expect(block5.hash.toString('hex')).toBe('e5'.padEnd(64, 'e'));
    await expect(repo.getBlockByHeight(999)).rejects.toThrow('Block with height 999 not found');
  });

  it('should handle empty database gracefully', async () => {
    // Only check for not found on a non-existent block
    await expect(repo.getBlockByHeight(99999)).rejects.toThrow();
  });
});

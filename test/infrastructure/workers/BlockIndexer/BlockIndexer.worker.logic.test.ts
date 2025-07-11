import { PrismaClient } from '@prisma/client';
import { api } from '../../../../src/infrastructure/Workers/BlockIndexer/BlockIndexer.worker.logic';
import { BlockChainType } from '../../../../src/application/types/BlockChain';

const prisma = new PrismaClient();

describe('BlockIndexer.worker.logic api', () => {
  beforeAll(async () => {
    await prisma.block.deleteMany({});
  });
  
  afterEach(async () => {
    await prisma.block.deleteMany({});
  });

  it('should create the database table after start', async () => {
    api.__reset();
    await prisma.block.deleteMany({});
    await api.start(BlockChainType.Test);
    // Check table exists by inserting and querying a block
    const testBlock = { hash: Buffer.from('abcd', 'hex'), blockHeight: 1 };
    await prisma.block.create({ data: { ...testBlock } });
    const found = await prisma.block.findUnique({ where: { blockHeight: 1 } });
    expect(found).toBeDefined();
    await prisma.block.delete({ where: { blockHeight: 1 } });
    api.stop();
  });

  it('should not start twice', async () => {
    api.__reset();
    await api.start(BlockChainType.Test);
    await api.start(BlockChainType.Test); // should not throw
    api.stop();
  });

  it('should stop and reset', async () => {
    api.__reset();
    await api.start(BlockChainType.Test);
    api.stop();
    api.__reset();
    // Should be able to start again
    await api.start(BlockChainType.Test);
    api.stop();
  });
});

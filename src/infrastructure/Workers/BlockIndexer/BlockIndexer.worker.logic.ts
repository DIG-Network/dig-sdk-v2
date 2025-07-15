import { getDatabaseProvider } from '../../DatabaseProvider';
import { Observable } from 'observable-fns';
import { ChiaBlockchainService } from '../../BlockchainServices/ChiaBlockchainService';
import { IBlockchainService } from '../../BlockchainServices/IBlockChainService';
import { Block } from '../../../application/types/Block';
import { BlockChainType } from '../../../application/types/BlockChain';

const prisma = getDatabaseProvider().getPrismaClient();

let intervalId: NodeJS.Timeout | null = null;
let started = false;

let blockObservable: Observable<Block> | null = null;
let blockObserver: ((block: Block) => void) | null = null;

let blockHeight = 0;

let blockchainService: IBlockchainService;

async function syncToBlockchainHeight() {
  const row = await prisma.block.findFirst({ orderBy: { blockHeight: 'desc' } });
  blockHeight = row && typeof row.blockHeight === 'number' && !isNaN(row.blockHeight) ? row.blockHeight : 0;

  const blockchainHeight = await blockchainService.getCurrentBlockchainHeight();
  if (blockchainHeight > blockHeight) {
    for (let h = blockHeight + 1; h <= blockchainHeight; h++) {
      const block = await blockchainService.getBlockchainBlockByHeight(h);
      if (block) {
        await prisma.block.create({
          data: {
            hash: Buffer.isBuffer(block.hash) ? block.hash : Buffer.from(block.hash),
            blockHeight: block.blockHeight,
          },
        });
        if (blockObserver) {
          blockObserver(block);
        }
      }
      blockHeight = h;
    }
  }
}

export const api = {
  /**
   * Start the BlockIndexer worker.
   * @param blockchainType String to select blockchain service.
   * @param dbPath Path to the SQLite database file. (Ignored, always uses Prisma)
   */
  async start(blockchainType: string) {
    if (started) return;
    switch (blockchainType) {
      case BlockChainType.Chia:
      default:
        blockchainService = new ChiaBlockchainService();
        break;
    }
    await syncToBlockchainHeight();
    started = true;
    intervalId = setInterval(syncToBlockchainHeight, 1000);
  },
  stop() {
    if (intervalId) clearInterval(intervalId);
    started = false;
  },
  onBlockIngested() {
    if (!blockObservable) {
      blockObservable = new Observable<Block>((observer) => {
        blockObserver = (block: Block) => {
          observer.next(block);
        };
        return () => {
          blockObserver = null;
        };
      });
    }
    return blockObservable;
  },
  // For testing: reset all state
  async __reset() {
    if (intervalId) clearInterval(intervalId);
    await prisma.$disconnect();
    intervalId = null;
    started = false;
    blockObservable = null;
    blockObserver = null;
  },
};

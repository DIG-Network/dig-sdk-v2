import Database from 'better-sqlite3';
import { Observable } from 'observable-fns';
import { ChiaBlockchainService } from '../../BlockchainServices/ChiaBlockchainService';
import { IBlockchainService } from '../../BlockchainServices/IBlockChainService';
import { CREATE_BLOCKS_TABLE_SQL } from '../../../application/repositories/BlockRepository';
import { Block } from '../../../application/types/Block';
import { BlockChainType } from '../../../application/types/BlockChain';


let db: Database.Database | null = null;
let intervalId: NodeJS.Timeout | null = null;
let started = false;

let blockObservable: Observable<Block> | null = null;
let blockObserver: ((block: Block) => void) | null = null;

let blockHeight = 0;

let blockchainService: IBlockchainService;

async function syncToBlockchainHeight() {
  const row = db!.prepare('SELECT MAX(blockHeight) as maxHeight FROM blocks').get() as {
    maxHeight?: number;
  };
  blockHeight =
    row && typeof row.maxHeight === 'number' && !isNaN(row.maxHeight) ? row.maxHeight : 0;

  const blockchainHeight = await blockchainService.getCurrentBlockchainHeight();
  if (blockchainHeight > blockHeight) {
    for (let h = blockHeight + 1; h <= blockchainHeight; h++) {
      const block = await blockchainService.getBlockchainBlockByHeight(h);
      if (block && db) {
        db.prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)').run(
          block.hash,
          block.blockHeight,
        );
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
   * @param dbPath Path to the SQLite database file.
   */
  async start(blockchainType: string, dbPath: string = './block_indexer.sqlite') {
    if (started) return;
    db = new Database(dbPath);
    db.exec(CREATE_BLOCKS_TABLE_SQL);

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
  __reset() {
    if (intervalId) clearInterval(intervalId);
    if (db) db.close();
    db = null;
    intervalId = null;
    started = false;
    blockObservable = null;
    blockObserver = null;
  },
};

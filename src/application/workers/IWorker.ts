import { BlockChainType } from '../types/BlockChain';

export interface IWorker {
  start(blockchainType: BlockChainType, dbPath?: string): Promise<void>;
  stop(): Promise<void>;
}

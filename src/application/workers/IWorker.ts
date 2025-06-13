import { BlockChainType } from '../types/BlockChain';

export interface IWorker {
  start(blockchainType: BlockChainType, dbPath?: string, restartIntervalHours?: number): Promise<void>;
  stop(): Promise<void>;
}

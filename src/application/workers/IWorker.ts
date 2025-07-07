import { BlockChainType } from '../types/BlockChain';

export interface IWorker {
  start(blockchainType: BlockChainType, restartIntervalHours?: number): Promise<void>;
  stop(): Promise<void>;
}

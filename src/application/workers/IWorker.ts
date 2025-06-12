import { BlockChainType } from "../types/BlockChain";

export interface IWorker {
  initialize(
    blockchainType: BlockChainType,
    dbPath?: string
  ): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}
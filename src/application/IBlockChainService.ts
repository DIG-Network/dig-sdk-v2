import { Block } from "./workers/BlockIndexer/BlockIndexer.worker";

export interface IBlockchainService {
  getCurrentBlockchainHeight(): Promise<number>;
  getBlockchainBlockByHeight(height: number): Promise<Block>;
}
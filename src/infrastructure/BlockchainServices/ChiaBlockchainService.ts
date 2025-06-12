import { IBlockchainService } from "../../application/IBlockChainService";
import { Block } from "../../application/types/Block";

export class ChiaBlockchainService implements IBlockchainService {
  async getCurrentBlockchainHeight(): Promise<number> {
    return 0;
  }
  async getBlockchainBlockByHeight(height: number): Promise<Block> {
    return { hash: 'dummy', blockHeight: height };
  }
}
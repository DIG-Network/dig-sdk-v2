import { Block } from '../../types/Block';

export interface IBlockRepository {
  getLatestBlock(): Promise<Block>;
  getBlockByHeight(height: number): Promise<Block>;
}

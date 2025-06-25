import { Block } from "../../types/Block";

export const enum BlockIndexerEventNames {
    BlockIngested = 'hashGenerated',
}

export interface BlockIndexerEvents {
  on(event: BlockIndexerEventNames.BlockIngested, listener: (block: Block) => void): this;
  emit(event: BlockIndexerEventNames.BlockIngested, block: Block): boolean;
}

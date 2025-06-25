import { EventEmitter } from 'events';
import { Block } from "../../types/Block";

export const enum BlockIndexerEventNames {
    BlockIngested = 'hashGenerated',
}

export class BlockIndexerEvents extends EventEmitter {
  emitBlockIngested(block: Block): boolean {
    return this.emit(BlockIndexerEventNames.BlockIngested, block);
  }

  onBlockIngested(listener: (block: Block) => void): this {
    return this.on(BlockIndexerEventNames.BlockIngested, listener);
  }
}

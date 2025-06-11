import { Observable, Subscription } from 'observable-fns';
import { Block } from '../BlockIndexer/BlockIndexer.worker';
import { HashChain } from '@dignetwork/proof-of-storage-continuity';

let subscription: Subscription<Block> | null = null;
let publicKey: string | null = null;

export const api = {
  initialize(blockIndexer: { onHashGenerated: () => Observable<Block> }, publicKeyParam: string) {
    publicKey = publicKeyParam;
    if (subscription) return;
    subscription = blockIndexer.onHashGenerated().subscribe((row: Block) => {
      api.recalculate(row);
    });
  },
  recalculate(newRow: Block) {
    if (!publicKey) throw new Error('Public key is not initialized.');
    new HashChain(Buffer.from(publicKey, 'hex'), newRow.blockHeight, Buffer.from(newRow.hash, 'hex'))
  },
};

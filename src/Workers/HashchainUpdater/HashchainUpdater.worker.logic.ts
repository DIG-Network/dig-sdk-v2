import { Block } from '../BlockIndexer/BlockIndexer.worker';
import { HashChain } from '@dignetwork/proof-of-storage-continuity';

let publicKey: string | null = null;
let hashChain: HashChain | null = null;

export const api = {
  initialize(publicKeyParam: string) {
    publicKey = publicKeyParam;
  },
  recalculate(newRow: Block) {
    if (!publicKey) throw new Error('Public key is not initialized.');
    if (!hashChain) {
      hashChain = new HashChain(Buffer.from(publicKey, 'hex'), newRow.blockHeight, Buffer.from(newRow.hash, 'hex'));
    } else {
      hashChain.addBlock(Buffer.from(newRow.hash, 'hex'));
    }
  },
};

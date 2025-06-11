import { api } from './BlockIndexer.worker.logic';
import { expose } from 'threads/worker';

export type Block = { hash: string, blockHeight: number };

expose(api);

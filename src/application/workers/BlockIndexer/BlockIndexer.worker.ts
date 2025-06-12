import { api } from './BlockIndexer.worker.logic';
import { expose } from 'threads/worker';

expose(api);

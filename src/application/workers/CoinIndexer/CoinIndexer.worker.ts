import { expose } from 'threads/worker';
import { api } from './CoinIndexer.worker.logic';

expose(api);
import { expose } from 'threads/worker';
import { api } from './HashchainUpdater.worker.logic';

expose(api);

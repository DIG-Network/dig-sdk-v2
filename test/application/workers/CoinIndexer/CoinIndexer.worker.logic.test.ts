import { api as coinIndexerApi } from '../../../../src/application/workers/CoinIndexer/CoinIndexer.worker.logic';
import { BlockChainType } from '../../../../src/application/types/BlockChain';
import { PeerType } from '@dignetwork/datalayer-driver';

describe('CoinIndexer.worker.logic api', () => {
  it('should not start twice', async () => {
    coinIndexerApi.__reset();
    await coinIndexerApi.start(BlockChainType.Test, 'ca.crt', 'ca.key', PeerType.Simulator);
    await coinIndexerApi.start(BlockChainType.Test, 'ca.crt', 'ca.key', PeerType.Simulator); // should not throw
    coinIndexerApi.stop();
  }, 10000);

  it('should stop and reset', async () => {
    coinIndexerApi.__reset();
    await coinIndexerApi.start(BlockChainType.Test, 'ca.crt', 'ca.key', PeerType.Simulator);
    coinIndexerApi.stop();
    coinIndexerApi.__reset();
    // Should be able to start again
    await coinIndexerApi.start(BlockChainType.Test, 'ca.crt', 'ca.key', PeerType.Simulator);
    coinIndexerApi.stop();
  });
});

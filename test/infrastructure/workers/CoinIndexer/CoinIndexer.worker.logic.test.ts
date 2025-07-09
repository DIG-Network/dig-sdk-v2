import { api as coinIndexerApi } from '../../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer.worker.logic';
import { BlockChainType } from '../../../../src/application/types/BlockChain';
import { PeerType } from '@dignetwork/datalayer-driver';

describe('CoinIndexer.worker.logic api', () => {
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

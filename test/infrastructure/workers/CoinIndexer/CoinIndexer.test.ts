import { CoinIndexer } from '../../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { CoinRepository } from '../../../../src/infrastructure/Repositories/CoinRepository';
import { WalletService } from '../../../../src/application/services/WalletService';

describe('CoinIndexer', () => {
  let coinIndexer: CoinIndexer;

  beforeEach(() => {
    coinIndexer = new CoinIndexer();
  });

  it('should instantiate and start without error', async () => {
    await expect(coinIndexer.start()).resolves.not.toThrow();
  });

  it('should emit CoinStateUpdated on blockReceived', async () => {
    // This is a placeholder test. You should mock ChiaBlockListener and CoinRepository for a real test.
    expect(typeof coinIndexer.onCoinStateUpdated).toBe('function');
  });
});

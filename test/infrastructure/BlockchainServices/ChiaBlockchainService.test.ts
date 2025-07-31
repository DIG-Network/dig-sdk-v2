import { ChiaBlockchainService } from '../../../src/infrastructure/BlockchainServices/ChiaBlockchainService';

describe('ChiaBlockchainService', () => {
  describe('calculateFeeForCoinSpends', () => {
    it('should return the default fee, but fail if not changed after 1 year', async () => {
      const now = new Date();
      const cutoff = new Date('2026-06-24T00:00:00Z'); // 1 year from today
      if (now >= cutoff) {
        throw new Error('calculateFeeForCoinSpends must be reviewed and updated after 1 year!');
      }
      const fee = await ChiaBlockchainService.prototype.calculateFeeForCoinSpends.call(
        new ChiaBlockchainService(),
      );
      expect(fee).toBe(BigInt(1000000));
    });
  });
});

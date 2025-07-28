import { mapCoinRecordToDatalayerCoin } from '../../../src/infrastructure/Repositories/CoinMappers';
import { CoinRecord } from '@dignetwork/chia-block-listener';

describe('mapCoinRecordToDatalayerCoin', () => {
  it('should map CoinRecord to Datalayer Coin', () => {
    const coinRecord: CoinRecord = {
      parentCoinInfo: 'aabbcc',
      puzzleHash: 'ffeedd',
      amount: '12345',
    };
    const coin = mapCoinRecordToDatalayerCoin(coinRecord);
    expect(coin.parentCoinInfo).toBeInstanceOf(Buffer);
    expect(coin.puzzleHash).toBeInstanceOf(Buffer);
    expect(coin.amount).toBe(BigInt(coinRecord.amount));
    expect(coin.parentCoinInfo.toString('hex')).toBe(coinRecord.parentCoinInfo);
    expect(coin.puzzleHash.toString('hex')).toBe(coinRecord.puzzleHash);
  });
});

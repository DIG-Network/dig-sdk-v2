jest.mock('chia-wallet-sdk', () => {
  class MockCoin {
    constructor(public parentCoinInfo: Uint8Array, public puzzleHash: Uint8Array, public amount: bigint) {}
  }
  class MockCoinSpend {
    constructor(public coin: any, public puzzleReveal: Uint8Array, public solution: Uint8Array) {}
  }
  return {
    Coin: MockCoin,
    CoinSpend: MockCoinSpend,
  };
});

import { mapListenerCoinSpendToWalletCoinSpend } from '../../../../src/infrastructure/Workers/CoinIndexer/CoinSpendMapper';

describe('mapListenerCoinSpendToWalletCoinSpend', () => {
  it('should map a ListenerCoinSpend to a WalletCoinSpend', () => {
    const listenerSpend = {
      coin: {
        parentCoinInfo: 'aabbcc',
        puzzleHash: 'ddeeff',
        amount: '42',
      },
      puzzleReveal: '0102',
      solution: '0304',
    };
    const walletCoinSpend = mapListenerCoinSpendToWalletCoinSpend(listenerSpend as any);
    expect(walletCoinSpend.constructor.name).toBe('MockCoinSpend');
    expect(walletCoinSpend.coin.constructor.name).toBe('MockCoin');
    expect(walletCoinSpend.coin.parentCoinInfo).toBeInstanceOf(Uint8Array);
    expect(walletCoinSpend.coin.puzzleHash).toBeInstanceOf(Uint8Array);
    expect(walletCoinSpend.coin.amount).toBe(BigInt(42));
    expect(walletCoinSpend.puzzleReveal).toBeInstanceOf(Uint8Array);
    expect(walletCoinSpend.solution).toBeInstanceOf(Uint8Array);
  });
});

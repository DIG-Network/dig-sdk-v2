import { CoinSpend as ListenerCoinSpend, CoinRecord } from '@dignetwork/chia-block-listener';
// Adjust the import path below to match your chia-wallet-sdk installation
import { Coin, CoinSpend as WalletCoinSpend } from 'chia-wallet-sdk';

function hexToUint8Array(hex: string): Uint8Array {
  hex = hex.trim().replace(/^0x/, '');
  if (hex.length % 2 !== 0) hex = '0' + hex;
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}

function mapCoinRecordToCoin(record: CoinRecord): Coin {
  return new Coin(
    hexToUint8Array(record.parentCoinInfo),
    hexToUint8Array(record.puzzleHash),
    BigInt(record.amount),
  );
}

export function mapListenerCoinSpendToWalletCoinSpend(
  listenerSpend: ListenerCoinSpend,
): WalletCoinSpend {
  const coin = mapCoinRecordToCoin(listenerSpend.coin);
  const puzzleReveal = hexToUint8Array(listenerSpend.puzzleReveal);
  const solution = hexToUint8Array(listenerSpend.solution);
  return new WalletCoinSpend(coin, puzzleReveal, solution);
}

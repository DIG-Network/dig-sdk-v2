import type { Buffer } from 'buffer';
import type { UnspentCoinsResponse } from '@dignetwork/datalayer-driver';

export interface IL1Peer {
  getPeak(): Promise<number | null>;
  getAllUnspentCoins(
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer
  ): Promise<UnspentCoinsResponse>;
  isCoinSpent(
    coinId: Buffer,
    lastHeight: number,
    headerHash: Buffer
  ): Promise<boolean>;
  getHeaderHashByHeight(height: number): Promise<Buffer>;
}

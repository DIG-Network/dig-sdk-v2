import type { Peer } from '@dignetwork/datalayer-driver';
import type { Buffer } from 'buffer';
import type { UnspentCoinsResponse } from '@dignetwork/datalayer-driver';
import { IL1Peer } from '../../application/interfaces/IL1Peer';

export class L1ChiaPeer implements IL1Peer {
  private peer: Peer;

  public constructor(peer: Peer) {
    this.peer = peer;
  }

  async getPeak(): Promise<number | null> {
    return this.peer.getPeak();
  }

  async getAllUnspentCoins(
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer
  ): Promise<UnspentCoinsResponse> {
    return this.peer.getAllUnspentCoins(puzzleHash, previousHeight, previousHeaderHash);
  }

  async isCoinSpent(
    coinId: Buffer,
    lastHeight: number,
    headerHash: Buffer
  ): Promise<boolean> {
    return this.peer.isCoinSpent(coinId, lastHeight, headerHash);
  }

  async getHeaderHashByHeight(
    height: number
  ): Promise<Buffer> {
    return await this.peer.getHeaderHash(height);
  }
}

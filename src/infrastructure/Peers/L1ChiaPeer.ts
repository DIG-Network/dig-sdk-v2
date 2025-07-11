import { Peer } from '@dignetwork/datalayer-driver';
import type { Buffer } from 'buffer';
import type { UnspentCoinsResponse, CoinSpend, Tls, PeerType } from '@dignetwork/datalayer-driver';

export interface IL1ChiaPeer {
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
  broadcastSpend(coinSpends: CoinSpend[], signatures: Buffer[]): Promise<string | null>;
}

export class L1ChiaPeer implements IL1ChiaPeer {
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

  async broadcastSpend(coinSpends: CoinSpend[], signatures: Buffer[]): Promise<string | null> {
    // This is a placeholder. Replace with actual RPC or network call as needed.
    if (typeof this.peer.broadcastSpend === 'function') {
      return this.peer.broadcastSpend(coinSpends, signatures);
    }
    throw new Error('broadcastSpend not implemented');
  }

  static async connectRandom(peerType: PeerType, tls: Tls): Promise<IL1ChiaPeer> {
    const peer = await Peer.connectRandom(peerType, tls);
    if (!peer) throw new Error('Failed to connect to peer');
    return new L1ChiaPeer(peer);
  }
}

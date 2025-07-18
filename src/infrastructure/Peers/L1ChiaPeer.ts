import { Peer } from '@dignetwork/datalayer-driver';
import type { Buffer } from 'buffer';
import type { UnspentCoinsResponse, CoinSpend, Tls, PeerType } from '@dignetwork/datalayer-driver';
import * as dns from 'dns/promises';
import config from '../../config';
import { BlockchainNetwork } from '../../config/types/BlockchainNetwork';

export interface IL1ChiaPeer {
  getPeak(): Promise<number | null>;
  getAllUnspentCoins(
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer,
  ): Promise<UnspentCoinsResponse>;
  isCoinSpent(coinId: Buffer, lastHeight: number, headerHash: Buffer): Promise<boolean>;
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
    previousHeaderHash: Buffer,
  ): Promise<UnspentCoinsResponse> {
    return this.peer.getAllUnspentCoins(puzzleHash, previousHeight, previousHeaderHash);
  }

  async isCoinSpent(coinId: Buffer, lastHeight: number, headerHash: Buffer): Promise<boolean> {
    return this.peer.isCoinSpent(coinId, lastHeight, headerHash);
  }

  async getHeaderHashByHeight(height: number): Promise<Buffer> {
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

  static async discoverRawDataPeers() {
    let introducers = [];
    if (config.BLOCKCHAIN_NETWORK === BlockchainNetwork.MAINNET) {
      introducers = [
        'dns-introducer.chia.net',
        'chia.ctrlaltdel.ch',
        'seeder.dexie.space',
        'chia.hoffmang.com',
      ];
    } else {
      introducers = ['dns-introducer-testnet11.chia.net'];
    }

    const allPeers = [];

    for (const introducer of introducers) {
      try {
        const addressesv6 = await dns.resolve6(introducer);
        const addressesv4 = await dns.resolve4(introducer);
        const port = config.BLOCKCHAIN_NETWORK === BlockchainNetwork.MAINNET ? 8444 : 58444;
        const peers = [...addressesv6, ...addressesv4].map((ip) => ({
          host: ip,
          port: port,
          source: introducer,
        }));
        allPeers.push(...peers);
      } catch {
        //
      }
    }

    const uniquePeers = Array.from(new Map(allPeers.map((p) => [p.host, p])).values());

    return uniquePeers;
  }
}

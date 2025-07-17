import { EventEmitter } from 'events';
import {
  CoinIndexerEventNames,
  CoinIndexerEvents,
  CoinStateUpdatedEvent,
} from './CoinIndexerEvents';
import { BlockReceivedEvent, ChiaBlockListener } from '@dignetwork/chia-block-listener';
import { L1ChiaPeer } from '../../Peers/L1ChiaPeer';
import config from '../../../config';
import { CoinRepository } from '../../Repositories/CoinRepository';

import { BlockRepository } from '../../../application/repositories/BlockRepository';
import { BlockchainNetwork } from '../../../config/types/BlockchainNetwork';
import { mapCoinSpendToSpend } from '../../Repositories/CoinMappers';

interface ICoinIndexer {
  onCoinStateUpdated(listener: (coinState: CoinStateUpdatedEvent) => void): void;
}

export class CoinIndexer
  extends (EventEmitter as { new (): CoinIndexerEvents })
  implements ICoinIndexer
{
  private started = false;
  private listener: ChiaBlockListener;

  private coinRepo: CoinRepository;
  private blockRepo: BlockRepository;

  private minConnections;
  private connectedPeers: Set<string>;

  constructor(minConnections: number = 5) {
    super();
    this.minConnections = minConnections;
    this.listener = new ChiaBlockListener();
    this.coinRepo = new CoinRepository();
    this.blockRepo = new BlockRepository();
    this.connectedPeers = new Set();
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.listener.on('peerConnected', this.handlePeerConnected);
    this.listener.on('peerDisconnected', this.handlePeerDisconnected);

    await this.addPeersToListener();

    this.listener.on('blockReceived', async (block: BlockReceivedEvent) => {
      console.log(`Block received: height=${block.height}, hash=${block.headerHash}`);
      await this.blockRepo.addBlock(block.height, block.headerHash);

      await this.handleCoinCreations(block);
      await this.handleCoinSpends(block);
    });
  }

  private async addPeersToListener() {
    const peers = await L1ChiaPeer.discoverRawDataPeers();
    let peerIdx = 0;
    while (this.connectedPeers.size < this.minConnections && peerIdx < peers.length) {
      const peer = peers[peerIdx++];
      const key = `${peer.host}:${peer.port}`;
      if (this.connectedPeers.has(key)) continue;
      try {
        this.listener.addPeer(
          peer.host,
          peer.port,
          config.BLOCKCHAIN_NETWORK === BlockchainNetwork.MAINNET ? 'mainnet' : 'testnet11',
        );
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  private async handleCoinSpends(block: BlockReceivedEvent) {
    if (!block.coinSpends) return;
    for (const coinSpend of block.coinSpends) {
      if (coinSpend.puzzleReveal && coinSpend.solution && typeof coinSpend.offset === 'number') {
        await this.coinRepo.addSpend(mapCoinSpendToSpend(coinSpend));
      }
    }
  }

  private async handleCoinCreations(block: BlockReceivedEvent) {
    if (!block.coinCreations) return;
    for (const coin of block.coinCreations) {
      await this.coinRepo.upsertCoin({
        coinId: coin.parentCoinInfo + coin.puzzleHash + coin.amount,
        parentCoinInfo: coin.parentCoinInfo,
        puzzleHash: coin.puzzleHash,
        amount: coin.amount,
      });
    }
  }

  private handlePeerDisconnected = async (peer: { host: string; port: number }) => {
    const key = `${peer.host}:${peer.port}`;
    this.connectedPeers.delete(key);
    while (this.connectedPeers.size < this.minConnections) {
      const peers = await L1ChiaPeer.discoverRawDataPeers();
      for (const candidate of peers) {
        const candidateKey = `${candidate.host}:${candidate.port}`;
        if (!this.connectedPeers.has(candidateKey)) {
          try {
            this.listener.addPeer(
              candidate.host,
              candidate.port,
              config.BLOCKCHAIN_NETWORK === BlockchainNetwork.MAINNET ? 'mainnet' : 'testnet11',
            );
            break;
          } catch {}
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  private handlePeerConnected = (peer: { host: string; port: number }) => {
    const key = `${peer.host}:${peer.port}`;
    this.connectedPeers.add(key);
  };

  async stop(): Promise<void> {
    this.started = false;
  }

  onCoinStateUpdated(listener: (coinState: CoinStateUpdatedEvent) => void): void {
    this.on(CoinIndexerEventNames.CoinStateUpdated, listener);
  }
}

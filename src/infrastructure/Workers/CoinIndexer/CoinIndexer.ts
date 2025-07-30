import { EventEmitter } from 'events';
import { CoinIndexerEventNames, CoinIndexerEvents } from './CoinIndexerEvents';
import { Block } from '../../../application/entities/Block';
import {
  BlockReceivedEvent,
  ChiaBlockListener,
  CoinRecord,
  CoinSpend,
  PeerConnectedEvent,
  PeerDisconnectedEvent,
} from '@dignetwork/chia-block-listener';

import { L1ChiaPeer } from '../../Peers/L1ChiaPeer';
import config from '../../../config';
import { BlockchainNetwork } from '../../../config/types/BlockchainNetwork';
import { getDataSource } from '../../DatabaseProvider';
import { BlockRepository } from '../../../application/repositories/BlockRepository';
import {
  parseNftFromSpend,
  parseCatFromSpend,
  parseDidFromSpend,
  parseClawbackFromSpend,
  parseStreamedCatFromSpend,
} from './NftCatParsers';

interface ICoinIndexer {
  onCoinCreated(listener: (event: CoinRecord) => void): void;
  onSpendCreated(listener: (event: CoinSpend) => void): void;
  onNewBlockIngested(listener: (event: Block) => void): void;
}

export class CoinIndexer
  extends (EventEmitter as { new (): CoinIndexerEvents })
  implements ICoinIndexer
{
  private started = false;
  private listener: ChiaBlockListener;

  private minConnections;
  private connectedPeers: string[];
  private ignoredPeers: Set<string> = new Set();

  private blockRepo: BlockRepository;

  private blockQueue: BlockReceivedEvent[] = [];
  private processingBlock = false;

  constructor(minConnections: number = 5) {
    super();
    this.minConnections = minConnections;
    this.listener = new ChiaBlockListener();
    this.blockRepo = new BlockRepository();
    this.connectedPeers = [];
  }

  onCoinCreated(listener: (event: CoinRecord) => void): void {
    this.on(CoinIndexerEventNames.CoinCreated, listener);
  }

  onSpendCreated(listener: (event: CoinSpend) => void): void {
    this.on(CoinIndexerEventNames.SpendCreated, listener);
  }

  onNewBlockIngested(listener: (event: Block) => void): void {
    this.on(CoinIndexerEventNames.NewBlockIngested, listener);
  }

  onNftSpend(listener: (event: unknown) => void): void {
    this.on(CoinIndexerEventNames.NftSpend, listener);
  }
  onCatSpend(listener: (event: unknown) => void): void {
    this.on(CoinIndexerEventNames.CatSpend, listener);
  }
  onDidSpend(listener: (event: unknown) => void): void {
    this.on(CoinIndexerEventNames.DidSpend, listener);
  }
  onStreamedCatSpend(listener: (event: unknown) => void): void {
    this.on(CoinIndexerEventNames.StreamedCatSpend, listener);
  }
  onClawbackSpend(listener: (event: unknown) => void): void {
    this.on(CoinIndexerEventNames.ClawbackSpend, listener);
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.listener.on('peerConnected', this.handlePeerConnected);
    this.listener.on('peerDisconnected', this.handlePeerDisconnected);

    await this.addPeersToListener();

    this.listener.on('blockReceived', (block: BlockReceivedEvent) => {
      this.enqueueBlock(block);
    });
  }

  private enqueueBlock(block: BlockReceivedEvent) {
    this.blockQueue.push(block);
    this.processNextBlock();
  }

  private async processNextBlock() {
    if (this.processingBlock || this.blockQueue.length === 0) return;
    this.processingBlock = true;
    const block = this.blockQueue.shift()!;
    try {
      const ds = await getDataSource();
      const existingBlock = await ds
        .getRepository(Block)
        .findOne({ where: { height: block.height.toString() } });

      if (existingBlock && existingBlock.weight >= block.weight) {
        this.processingBlock = false;
        if (this.blockQueue.length > 0) {
          this.processNextBlock();
        }
        return;
      }

      const blockFromQueue = {
        height: block.height.toString(),
        headerHash: Buffer.from(block.headerHash, 'hex'),
        weight: block.weight.toString(),
        timestamp: new Date(block.timestamp),
      };
      
      await this.blockRepo.addBlock(blockFromQueue);

      await this.handleCoinCreations(block);
      await this.handleCoinSpends(block);

      this.emit(CoinIndexerEventNames.NewBlockIngested, blockFromQueue);
    } catch {
    } finally {
      this.processingBlock = false;
      if (this.blockQueue.length > 0) {
        this.processNextBlock();
      }
    }
  }

  private async addPeersToListener() {
    const peers = await L1ChiaPeer.discoverRawDataPeers();
    let peerIdx = 0;
    while (this.connectedPeers.length < this.minConnections && peerIdx < peers.length) {
      const peer = peers[peerIdx++];
      const key = `${peer.host}:${peer.port}`;
      if (this.connectedPeers.includes(key)) continue;
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
      this.emit(CoinIndexerEventNames.SpendCreated, coinSpend);

      // NFT
      try{
        const nft = parseNftFromSpend(coinSpend);
        if (nft) {
          this.emit(CoinIndexerEventNames.NftSpend, nft);
        }
      } catch{
      }

      // CAT
      try {
        const cat = parseCatFromSpend(coinSpend);
        if (cat) {
          this.emit(CoinIndexerEventNames.CatSpend, cat);
        }
      } catch {
      }
      // DID
      try {
        const did = parseDidFromSpend(coinSpend);
        if (did) {
          this.emit(CoinIndexerEventNames.DidSpend, did);
        }
      } catch {
      }
      // StreamedCat
      try {
        const streamedCat = parseStreamedCatFromSpend(coinSpend);
        if (streamedCat) {
          this.emit(CoinIndexerEventNames.StreamedCatSpend, streamedCat);
        }
      } catch {
      }
      // Clawback
      try {
        const clawback = parseClawbackFromSpend(coinSpend);
        if (clawback) {
          this.emit(CoinIndexerEventNames.ClawbackSpend, clawback);
        }
      } catch {
      }
    }
  }

  private async handleCoinCreations(block: BlockReceivedEvent) {
    if (!block.coinCreations) return;
    for (const coin of block.coinCreations) {
      this.emit(CoinIndexerEventNames.CoinCreated, coin);
    }
  }

  private handlePeerDisconnected = async (peer: PeerDisconnectedEvent) => {
    this.connectedPeers = this.connectedPeers.filter((id) => id !== peer.peerId);
    this.ignoredPeers.add(`${peer.host}:${peer.port}`);
    while (this.connectedPeers.length < this.minConnections) {
      let peers = await L1ChiaPeer.discoverRawDataPeers();
      peers = peers.filter((p) => !this.ignoredPeers.has(`${p.host}:${p.port}`));
      for (const candidate of peers) {
        const candidateKey = `${candidate.host}:${candidate.port}`;
        if (!this.connectedPeers.includes(candidateKey)) {
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

  private handlePeerConnected = (peer: PeerConnectedEvent) => {
    this.connectedPeers.push(peer.peerId);
  };

  async stop(): Promise<void> {
    this.started = false;
  }
}
export { CoinIndexerEventNames };

import { EventEmitter } from 'events';
import { CoinIndexerEventNames, CoinIndexerEvents } from './CoinIndexerEvents';
import { Coin } from '../../entities/Coin';
import { Spend } from '../../entities/Spend';
import { Block } from '../../../application/entities/Block';
import {
  BlockReceivedEvent,
  ChiaBlockListener,
  PeerConnectedEvent,
  PeerDisconnectedEvent,
} from '@dignetwork/chia-block-listener';
import { L1ChiaPeer } from '../../Peers/L1ChiaPeer';
import config from '../../../config';
import { CoinRepository } from '../../Repositories/CoinRepository';

import { BlockRepository } from '../../../application/repositories/BlockRepository';
import { BlockchainNetwork } from '../../../config/types/BlockchainNetwork';
import { getDataSource } from '../../DatabaseProvider';
import { EntityManager } from 'typeorm';
import {
  mapCoinRecordToDatalayerCoin,
  mapCoinRecordToUnspentCoin,
  mapCoinSpendToSpend,
} from '../../Repositories/CoinMappers';
import { ChiaBlockchainService } from '../../BlockchainServices/ChiaBlockchainService';

interface ICoinIndexer {
  onCoinCreated(listener: (event: Coin) => void): void;
  onSpendCreated(listener: (event: Spend) => void): void;
  onNewBlockIngested(listener: (event: Block) => void): void;
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
  private connectedPeers: string[];

  private blockQueue: BlockReceivedEvent[] = [];
  private processingBlock = false;

  constructor(minConnections: number = 5) {
    super();
    this.minConnections = minConnections;
    this.listener = new ChiaBlockListener();
    this.coinRepo = new CoinRepository();
    this.blockRepo = new BlockRepository();
    this.connectedPeers = [];
  }

  onCoinCreated(listener: (event: Coin) => void): void {
    this.on(CoinIndexerEventNames.CoinCreated, listener);
  }

  onSpendCreated(listener: (event: Spend) => void): void {
    this.on(CoinIndexerEventNames.SpendCreated, listener);
  }

  onNewBlockIngested(listener: (event: Block) => void): void {
    this.on(CoinIndexerEventNames.NewBlockIngested, listener);
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

      await ds.transaction(async (manager) => {
        await this.blockRepo.addBlock(blockFromQueue, manager);

        await this.handleCoinCreations(block, manager);
        await this.handleCoinSpends(block, manager);
        await this.updateUnspentCoinsFromBlock(block, manager);
      });

      this.emit(CoinIndexerEventNames.NewBlockIngested, blockFromQueue);
    } catch {
    } finally {
      this.processingBlock = false;
      if (this.blockQueue.length > 0) {
        this.processNextBlock();
      }
    }
  }

  async updateUnspentCoinsFromBlock(
    block: BlockReceivedEvent,
    manager: EntityManager,
  ): Promise<void> {
    if (block.coinCreations) {
      for (const coin of block.coinCreations) {
        await this.coinRepo.addUnspentCoin(mapCoinRecordToUnspentCoin(coin), manager);
      }
    }

    if (block.coinSpends) {
      for (const spend of block.coinSpends) {
        const coinId = ChiaBlockchainService.getCoinId(mapCoinRecordToDatalayerCoin(spend.coin));
        await this.coinRepo.deleteUnspentCoin(coinId.toString('hex'), manager);
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

  private async handleCoinSpends(block: BlockReceivedEvent, manager: EntityManager) {
    if (!block.coinSpends) return;
    for (const coinSpend of block.coinSpends) {
      const spend = mapCoinSpendToSpend(coinSpend);
      await this.coinRepo.addSpend(spend, manager);

      // Emit using Event<Spend>
      this.emit(CoinIndexerEventNames.SpendCreated, spend);
    }
  }

  private async handleCoinCreations(block: BlockReceivedEvent, manager: EntityManager) {
    if (!block.coinCreations) return;
    for (const coin of block.coinCreations) {
      const mappedCoin = mapCoinRecordToDatalayerCoin(coin);
      const coinId = ChiaBlockchainService.getCoinId(mappedCoin);
      const newCoin = {
        coinId: coinId.toString('hex'),
        parentCoinInfo: mappedCoin.parentCoinInfo,
        puzzleHash: mappedCoin.puzzleHash,
        amount: mappedCoin.amount.toString(),
      };
      await this.coinRepo.addCoin(newCoin, manager);

      this.emit(CoinIndexerEventNames.CoinCreated, newCoin);
    }
  }

  private handlePeerDisconnected = async (peer: PeerDisconnectedEvent) => {
    this.connectedPeers = this.connectedPeers.filter((id) => id !== peer.peerId);
    while (this.connectedPeers.length < this.minConnections) {
      const peers = await L1ChiaPeer.discoverRawDataPeers();
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

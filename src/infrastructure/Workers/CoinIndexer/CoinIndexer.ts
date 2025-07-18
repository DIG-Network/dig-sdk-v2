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
import { getDataSource } from '../../DatabaseProvider';
import { EntityManager } from 'typeorm';
import { mapCoinRecordToDatalayerCoin, mapCoinRecordToUnspentCoin, mapCoinSpendToSpend } from '../../Repositories/CoinMappers';
import { ChiaBlockchainService } from '../../BlockchainServices/ChiaBlockchainService';
import { Block } from '../../entities/Block';
import { CoinStatus } from '../../Repositories/CoinStatus';

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

  private blockQueue: BlockReceivedEvent[] = [];
  private processingBlock = false;

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
      const existingBlock = await ds.getRepository(Block).findOne({ where: { height: block.height.toString() } });

      if (existingBlock && existingBlock.weight >= block.weight) {
        this.processingBlock = false;
        if (this.blockQueue.length > 0) {
          this.processNextBlock();
        }
        return;
      }
      
      await ds.transaction(async (manager) => {
        await this.blockRepo.addBlock(
          block.height.toString(),
          Buffer.from(block.headerHash, 'hex'),
          block.weight.toString(),
          manager,
        );

        await this.handleCoinCreations(block, manager);
        await this.handleCoinSpends(block, manager);
        await this.updateUnspentCoinsFromBlock(block, manager);
      });
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
        await this.coinRepo.addUnspentCoin(
          mapCoinRecordToUnspentCoin(coin),
          manager,
        );
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

  private async handleCoinSpends(block: BlockReceivedEvent, manager: EntityManager) {
    if (!block.coinSpends) return;
    for (const coinSpend of block.coinSpends) {
      const spend = mapCoinSpendToSpend(coinSpend);
      await this.coinRepo.addSpend(spend, manager);

      this.emit(CoinIndexerEventNames.CoinStateUpdated, {
        coinId: spend.coinId,
        coinStatus: CoinStatus.SPENT,
        syncedHeight: block.height,
      } as CoinStateUpdatedEvent);
    }
  }

  private async handleCoinCreations(block: BlockReceivedEvent, manager: EntityManager) {
    if (!block.coinCreations) return;
    for (const coin of block.coinCreations) {
      const mappedCoin = mapCoinRecordToDatalayerCoin(coin);
      const coinId = ChiaBlockchainService.getCoinId(mappedCoin)
      await this.coinRepo.addCoin(
        {
          coinId: coinId.toString('hex'),
          parentCoinInfo: mappedCoin.parentCoinInfo,
          puzzleHash: mappedCoin.puzzleHash,
          amount: mappedCoin.amount.toString(),
        },
        manager,
      );

      this.emit(CoinIndexerEventNames.CoinStateUpdated, {
        coinId: coinId.toString('hex'),
        coinStatus: CoinStatus.UNSPENT,
        syncedHeight: block.height,
      } as CoinStateUpdatedEvent);
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

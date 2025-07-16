import { EventEmitter } from 'events';
import {
  CoinIndexerEventNames,
  CoinIndexerEvents,
  CoinStateUpdatedEvent,
} from './CoinIndexerEvents';
import { BlockReceivedEvent, ChiaBlockListener } from '@dignetwork/chia-block-listener';
import { L1ChiaPeer } from '../../Peers/L1ChiaPeer';
import { WalletService } from '../../../application/services/WalletService';
import config from '../../../config';
import { ChiaBlockchainService } from '../../BlockchainServices/ChiaBlockchainService';
import { CoinRepository } from '../../Repositories/CoinRepository';
import { CoinStatus } from '../../Repositories/CoinStatus';
import { BlockRepository } from '../../../application/repositories/BlockRepository';
import { BlockchainNetwork } from '../../../config/types/BlockchainNetwork';

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

  private chiaService: ChiaBlockchainService;

  private minConnections;
  private connectedPeers: Set<string>;

  constructor(minConnections: number = 5) {
    super();
    this.minConnections = minConnections;
    this.listener = new ChiaBlockListener();
    this.coinRepo = new CoinRepository();
    this.blockRepo = new BlockRepository();
    this.chiaService = new ChiaBlockchainService();
    this.connectedPeers = new Set();
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.listener.on('peerConnected', this.handlePeerConnected);
    this.listener.on('peerDisconnected', this.handlePeerDisconnected);

    await this.addPeersToListener();

    this.listener.on('blockReceived', async (block: BlockReceivedEvent) => {
      await this.blockRepo.addBlock(block.height, block.headerHash);

      const trackedPuzzleHashesToAddr: Record<string, string> =
        await this.getTrackedAddressesAsPuzzleHashToAddressMap();
      console.log(`Processing block at height ${block.height} with ${block.coinCreations?.length || 0} creations and ${block.coinSpends?.length || 0} spends`);
      console.log(`Tracked addresses: ${Object.values(trackedPuzzleHashesToAddr)}`);

      await this.handleCoinCreations(block, trackedPuzzleHashesToAddr);
      await this.handleCoinRemovals(block, trackedPuzzleHashesToAddr);
    });
  }

  private async getTrackedAddressesAsPuzzleHashToAddressMap(): Promise<Record<string, string>> {
    const addressRows = await WalletService.getWallets();

    const trackedPuzzleHashesToAddr: Record<string, string> = {};

    for (const row of addressRows) {
      const puzzleHash = this.chiaService.getPuzzleHash(row.address);
      trackedPuzzleHashesToAddr[puzzleHash.toString('hex')] = row.address;
    }

    return trackedPuzzleHashesToAddr;
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

  private async handleCoinRemovals(
    block: BlockReceivedEvent,
    trackedPuzzleHashesToAddr: Record<string, string>,
  ) {
    if (!block.coinSpends) return;
    for (const coinSpend of block.coinSpends) {
      const addr = trackedPuzzleHashesToAddr[coinSpend.coin.puzzleHash];
      if (addr) {
        console.log(`Coin spend for address ${addr}: ${coinSpend.coin.puzzleHash}`);
        await this.coinRepo.updateCoinStatus(
          addr,
          Buffer.from(
            coinSpend.coin.parentCoinInfo + coinSpend.coin.puzzleHash + coinSpend.coin.amount,
            'hex',
          ),
          CoinStatus.SPENT,
          block.height,
        );
        this.emit(CoinIndexerEventNames.CoinStateUpdated, {
          addressId: addr,
          coinId: Buffer.from(
            coinSpend.coin.parentCoinInfo + coinSpend.coin.puzzleHash + coinSpend.coin.amount,
            'hex',
          ),
          status: CoinStatus.SPENT,
          syncedHeight: block.height,
        });
      }
    }
  }

  private async handleCoinCreations(
    block: BlockReceivedEvent,
    trackedPuzzleHashesToAddr: Record<string, string>,
  ) {
    if (!block.coinCreations) return;
    for (const coin of block.coinCreations) {
      const walletAddr = trackedPuzzleHashesToAddr[coin.puzzleHash];
      console.log(`Processing coin creation for puzzle hash ${coin.puzzleHash}`);
      if (walletAddr) {
        console.log(`Coin creation for address ${walletAddr}: ${coin.puzzleHash}`);
        await this.coinRepo.upsertCoin(walletAddr, {
          coinId: Buffer.from(coin.parentCoinInfo + coin.puzzleHash + coin.amount, 'hex'),
          parentCoinInfo: Buffer.from(coin.parentCoinInfo, 'hex'),
          puzzleHash: Buffer.from(coin.puzzleHash, 'hex'),
          amount: BigInt(coin.amount),
          syncedHeight: block.height,
          status: CoinStatus.UNSPENT,
          assetId: 'xch',
        });
        this.emit(CoinIndexerEventNames.CoinStateUpdated, {
          addressId: walletAddr,
          coinId: Buffer.from(coin.parentCoinInfo + coin.puzzleHash + coin.amount, 'hex'),
          status: CoinStatus.UNSPENT,
          syncedHeight: block.height,
        });
      }
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
    console.log(`Peer connected: ${peer.host}:${peer.port}`);
    const key = `${peer.host}:${peer.port}`;
    console.log(`Connected peers: ${this.connectedPeers.size}`);
    this.connectedPeers.add(key);
  };

  async stop(): Promise<void> {
    this.started = false;
  }

  onCoinStateUpdated(listener: (coinState: CoinStateUpdatedEvent) => void): void {
    this.on(CoinIndexerEventNames.CoinStateUpdated, listener);
  }
}

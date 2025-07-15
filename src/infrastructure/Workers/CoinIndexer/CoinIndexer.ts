import { EventEmitter } from 'events';
import {
  CoinIndexerEventNames,
  CoinIndexerEvents,
  CoinStateUpdatedEvent,
} from './CoinIndexerEvents';
import { ChiaBlockListener } from '@dignetwork/chia-block-listener';
import { L1ChiaPeer } from '../../Peers/L1ChiaPeer';
import { WalletService } from '../../../application/services/WalletService';
import config from '../../../config';
import { ChiaBlockchainService } from '../../BlockchainServices/ChiaBlockchainService';
import { CoinRepository } from '../../Repositories/CoinRepository';
import { CoinStatus } from '../../Repositories/CoinStatus';

export interface CoinIndexerWorkerApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => any;
}

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
  private chiaService: ChiaBlockchainService;

  private minConnections;
  private connectedPeers: Set<string>;

  constructor(minConnections: number = 5) {
    super();
    this.minConnections = minConnections;
    this.listener = new ChiaBlockListener();
    this.coinRepo = new CoinRepository();
    this.chiaService = new ChiaBlockchainService();
    this.connectedPeers = new Set();
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.listener.on('peerConnected', this.handlePeerConnected);

    this.listener.on('peerDisconnected', this.handlePeerDisconnected);

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
          config.BLOCKCHAIN_NETWORK === 'mainnet' ? 'mainnet' : 'testnet11',
        );
      } catch {
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const addressRows = await WalletService.getWallets();

    const trackedPuzzleHashesToAddr: Record<string, string> = {};
    for (const row of addressRows) {
      const puzzleHash = this.chiaService.getPuzzleHash(row.address);
      trackedPuzzleHashesToAddr[puzzleHash.toString('hex')] = row.address;
    }

    // Listen for new blocks
    this.listener.on('blockReceived', async (block) => {
      console.log(`New block received: ${block.height}`);
      console.log(`Header hash: ${block.headerHash}`);
      console.log(`Timestamp: ${new Date(block.timestamp * 1000)}`);
      console.log(`Coin additions: ${block.coinAdditions.length}`);
      console.log(`Coin removals: ${block.coinRemovals.length}`);
      console.log(`Coin spends: ${block.coinSpends.length}`);

      for (const coin of block.coinAdditions) {
        console.log(`-----------------------------------------------`);
        console.log(`Coin addition: ${coin.puzzleHash} - ${coin.amount}`);
        console.log(`Parent coin info: ${coin.parentCoinInfo}`);
        console.log(`-----------------------------------------------`);
        const walletAddr = trackedPuzzleHashesToAddr[coin.puzzleHash];
        if (walletAddr) {
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
      
      for (const coin of block.coinRemovals) {
        console.log(`-----------------------------------------------`);
        console.log(`Coin removal: ${coin.puzzleHash} - ${coin.amount}`);
        console.log(`Parent coin info: ${coin.parentCoinInfo}`);
        console.log(`-----------------------------------------------`);
        const addr = trackedPuzzleHashesToAddr[coin.puzzleHash];
        if (addr) {
          await this.coinRepo.updateCoinStatus(
            addr,
            Buffer.from(coin.parentCoinInfo + coin.puzzleHash + coin.amount, 'hex'),
            CoinStatus.SPENT,
            block.height
          );
          this.emit(CoinIndexerEventNames.CoinStateUpdated, {
            addressId: addr,
            coinId: Buffer.from(coin.parentCoinInfo + coin.puzzleHash + coin.amount, 'hex'),
            status: CoinStatus.SPENT,
            syncedHeight: block.height,
          });
        }
      }
    });
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
              config.BLOCKCHAIN_NETWORK === 'mainnet' ? 'mainnet' : 'testnet11',
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

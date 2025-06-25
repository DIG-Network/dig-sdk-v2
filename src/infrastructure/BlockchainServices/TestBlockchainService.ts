/* eslint-disable @typescript-eslint/no-unused-vars */
import { IBlockchainService } from "../../application/interfaces/IBlockChainService";
import { Block } from "../../application/types/Block";
import Database from 'better-sqlite3';
import type { Coin, Peer, UnspentCoinsResponse } from '@dignetwork/datalayer-driver';

export class TestBlockchainService implements IBlockchainService {
  private db: Database.Database;

  constructor() {
    this.db = new Database('testservice.sqlite');
    this.db.exec(`CREATE TABLE IF NOT EXISTS blocks (hash BLOB, blockHeight INTEGER PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  }

  async getCurrentBlockchainHeight(): Promise<number> {
    const row = this.db.prepare('SELECT MAX(blockHeight) as maxHeight FROM blocks').get() as { maxHeight?: number };
    return row && typeof row.maxHeight === 'number' && !isNaN(row.maxHeight) ? row.maxHeight : 0;
  }

  async getBlockchainBlockByHeight(height: number): Promise<Block> {
    const row = this.db.prepare('SELECT hash, blockHeight FROM blocks WHERE blockHeight = ?').get(height) as { hash: Buffer, blockHeight: number } | undefined;
    if (!row) throw new Error(`Block at height ${height} not found in test DB`);
    return {
      hash: row.hash,
      blockHeight: row.blockHeight,
    };
  }

  masterSecretKeyFromSeed(seed: Buffer): Buffer { return Buffer.alloc(32, 1); }
  secretKeyToPublicKey(secretKey: Buffer): Buffer { return Buffer.alloc(32, 2); }
  masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer { return Buffer.alloc(32, 3); }
  masterSecretKeyToWalletSyntheticSecretKey(secretKey: Buffer): Buffer { return Buffer.alloc(32, 4); }
  masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer { return Buffer.alloc(32, 5); }
  puzzleHashToAddress(puzzleHash: Buffer, prefix: string): string { return prefix + puzzleHash.toString('hex'); }
  signMessage(message: Buffer, privateKey: Buffer): Buffer { return Buffer.from('deadbeef', 'hex'); }
  getCoinId(coin: Coin): Buffer { return Buffer.from('cafebabe', 'hex'); }
  selectCoins(coins: Coin[], amount: bigint): Coin[] { return coins.slice(0, 1); }

  // New methods for ColdWallet/WalletService
  getPuzzleHash(address: string): Buffer {
    return Buffer.from(address, 'utf-8'); // Dummy
  }
  verifyKeySignature(signature: Buffer, publicKey: Buffer, message: Buffer): boolean {
    return true; // Dummy
  }
  async listUnspentCoins(
    peer: Peer,
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer
  ): Promise<UnspentCoinsResponse> {
    // Dummy: return a fake response
    return { coins: [], lastHeight: 0, lastHeaderHash: Buffer.alloc(32) };
  }
  async isCoinSpendable(
    peer: Peer,
    coinId: Buffer,
    lastHeight: number,
    headerHash: Buffer
  ): Promise<boolean> {
    return true; // Dummy
  }
}
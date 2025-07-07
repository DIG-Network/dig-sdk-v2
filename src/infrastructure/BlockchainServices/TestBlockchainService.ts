/* eslint-disable @typescript-eslint/no-unused-vars */
import { IBlockchainService } from "./IBlockChainService";
import { Block } from "../../application/types/Block";
import Database from 'better-sqlite3';
import type { Coin, Peer, PeerType, Tls, UnspentCoinsResponse } from '@dignetwork/datalayer-driver';
import { COIN_TABLE_CREATE_SQL, CoinRow } from "../Repositories/CoinRepository";
import { IL1ChiaPeer, L1ChiaPeer } from "../Peers/L1ChiaPeer";
import { WALLET_TABLE_CREATE_SQL } from "../../application/repositories/WalletRepository";
import { CREATE_BLOCKS_TABLE_SQL } from "../../application/repositories/BlockRepository";

export class TestBlockchainService implements IBlockchainService {
  private db: Database.Database;

  constructor() {
    this.db = new Database('testservice.sqlite');
    this.db.exec(CREATE_BLOCKS_TABLE_SQL);
    this.db.exec(COIN_TABLE_CREATE_SQL);
    this.db.exec(WALLET_TABLE_CREATE_SQL);
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
  getCoinId(coin: Coin): Buffer { return coin.puzzleHash; }
  selectCoins(coins: Coin[], amount: bigint): Coin[] { return coins.slice(0, 1); }

  // New methods for ColdWallet/WalletService
  getPuzzleHash(address: string): Buffer {
    return Buffer.from(address, 'utf-8'); // Dummy
  }

  
  async listUnspentCoins(
    peer: IL1ChiaPeer,
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer
  ): Promise<UnspentCoinsResponse> {
    // Query the coins table for coins with puzzleHash and height >= previousHeight
    let rows: CoinRow[] = [];
    try{
      rows = this.db.prepare(
        'SELECT coinId, parentCoinInfo, puzzleHash, amount, status, walletId FROM coin'
      ).all() as CoinRow[];
    }
    catch (error) {
      console.error(`Error querying unspent coins: ${error}`);
      throw new Error(`Failed to query unspent coins: ${error}`);
    }
    if (!rows) throw new Error(`no data found for puzzleHash ${puzzleHash.toString('hex')} and height >= ${previousHeight}`);
    const coins = rows.map((row) => ({
      coinId: row.coinId,
      parentCoinInfo: row.parentCoinInfo,
      puzzleHash: row.puzzleHash,
      amount: BigInt(row.amount),
      status: row.status,
      walletId: row.walletId,
      blockHeight: row.syncedHeight,
    }));
    // Optionally, you can return lastHeight and lastHeaderHash if needed
    return { coins, lastHeight: 0, lastHeaderHash: Buffer.alloc(32) };
  }
  async isCoinSpendable(
    peer: IL1ChiaPeer,
    coinId: Buffer,
    lastHeight: number,
    headerHash: Buffer
  ): Promise<boolean> {
    return true; // Dummy
  }

  async connectRandom(peerType: PeerType, tls: Tls): Promise<L1ChiaPeer>{
    throw new Error("Method not implemented.");
  }

  getAddressPrefix() {
    return 'txch';
  }
}
import { IBlockchainService } from "../../application/IBlockChainService";
import { Block } from "../../application/types/Block";
import Database from 'better-sqlite3';

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
    const row = this.db.prepare('SELECT hash, blockHeight FROM blocks WHERE blockHeight = ?').get(height) as { hash: Buffer | string, blockHeight: number } | undefined;
    if (!row) throw new Error(`Block at height ${height} not found in test DB`);
    return {
      hash: Buffer.isBuffer(row.hash) ? row.hash.toString('hex') : row.hash,
      blockHeight: row.blockHeight,
    };
  }
}
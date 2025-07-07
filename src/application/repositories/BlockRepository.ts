import Database from 'better-sqlite3';
import { Block } from '../types/Block';
import { IBlockRepository } from './Interfaces/IBlockRepository';

export const CREATE_BLOCKS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS blocks (hash BLOB, blockHeight INTEGER PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`;
export const BLOCK_DB_FILE = 'blocks.sqlite'

export class BlockRepository implements IBlockRepository {
  private db: Database.Database;

  constructor() {
    this.db = new Database(BLOCK_DB_FILE);
    this.db.exec(CREATE_BLOCKS_TABLE_SQL);
  }

  async getLatestBlock(): Promise<Block> {
    const stmt = this.db.prepare('SELECT * FROM blocks ORDER BY blockHeight DESC LIMIT 1');
    const block = stmt.get() as { hash: Buffer, blockHeight: number } | undefined;
    if (!block) throw new Error('No blocks found');
    return block;
  }

  async getBlockByHeight(height: number): Promise<Block> {
    const stmt = this.db.prepare('SELECT * FROM blocks WHERE blockHeight = ?');
    const block = stmt.get(height) as { hash: Buffer, blockHeight: number } | undefined;
    if (!block) throw new Error(`Block with height ${height} not found`);
    return block;
  }
}

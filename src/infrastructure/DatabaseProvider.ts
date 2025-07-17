import { DataSource } from 'typeorm';
import config from '../config';
import { Address } from './entities/Address';
import { Spend } from './entities/Spend';
import { Block } from './entities/Block';
import fs from 'fs';
import path from 'path';
import { Coin } from './entities/Coin';
import { PendingCoin } from './entities/PendingCoin';


let dataSource: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }
  const dbType = config.DATABASE_TYPE || 'sqlite';
  const connectionString = config.DATABASE_URL || 'file:wallet.sqlite';
  let options;
  if (dbType === 'postgres') {
    options = {
      type: 'postgres' as const,
      url: connectionString,
      entities: [Address, Coin, Spend, Block, PendingCoin],
      migrations: [path.join(__dirname, 'migrations', 'postgres*.ts')],
      synchronize: true,
    };
  } else {
    options = {
      type: 'sqlite' as const,
      database: connectionString.replace('file:', ''),
      entities: [Address, Coin, Spend, Block, PendingCoin],
      migrations: [path.join(__dirname, 'migrations', 'sqlite*.ts')],
      synchronize: true,
    };
  }
  dataSource = new DataSource(options);
  await dataSource.initialize();

  // Apply the correct view migration after DB is initialized
  let migrationFile;
  if (dbType === 'postgres') {
    migrationFile = path.join(__dirname, 'migrations', 'postgres_unspent_coins_view.sql');
  } else {
    migrationFile = path.join(__dirname, 'migrations', 'sqlite_unspent_coins_view.sql');
  }
  if (fs.existsSync(migrationFile)) {
    const sql = fs.readFileSync(migrationFile, 'utf8');
    await dataSource.query(sql);
  }

  return dataSource;
}

import { DataSource } from 'typeorm';
import config from '../config';
import { Address } from './entities/Address';
import { AddedCoin } from './entities/AddedCoin';
import { SpentCoin } from './entities/SpentCoin';
import { Block } from './entities/Block';

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
      entities: [Address, AddedCoin, SpentCoin, Block],
      synchronize: true,
    };
  } else {
    options = {
      type: 'sqlite' as const,
      database: connectionString.replace('file:', ''),
      entities: [Address, AddedCoin, SpentCoin, Block],
      synchronize: true,
    };
  }
  dataSource = new DataSource(options);
  await dataSource.initialize();
  return dataSource;
}

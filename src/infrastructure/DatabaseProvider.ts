import { DataSource } from 'typeorm';
import config from '../config';
import { Address } from './entities/Address';
import { Spend } from './entities/Spend';
import { Block } from './entities/Block';
import { Coin } from './entities/Coin';
import { PendingCoin } from './entities/PendingCoin';
import { UnspentCoin } from './entities/UnspentCoin';


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
      entities: [Address, Coin, Spend, Block, PendingCoin, UnspentCoin],
      synchronize: true,
    };
  } else {
    options = {
      type: 'sqlite' as const,
      database: connectionString.replace('file:', ''),
      entities: [Address, Coin, Spend, Block, PendingCoin, UnspentCoin],
      synchronize: true,
    };
  }
  dataSource = new DataSource(options);
  await dataSource.initialize();

  return dataSource;
}

import { PrismaClient } from '@prisma/client';
import config from '../config';

export type DatabaseType = 'sqlite' | 'postgres';

export interface IDatabaseProvider {
  getPrismaClient(): PrismaClient;
}

class SqliteDatabaseProvider implements IDatabaseProvider {
  private client: PrismaClient;
  constructor(connectionString: string) {
    this.client = new PrismaClient({
      datasources: { db: { url: connectionString } },
    });
  }
  getPrismaClient() {
    return this.client;
  }
}

class PostgresDatabaseProvider implements IDatabaseProvider {
  private client: PrismaClient;
  constructor(connectionString: string) {
    this.client = new PrismaClient({
      datasources: { db: { url: connectionString } },
    });
  }
  getPrismaClient() {
    return this.client;
  }
}

export function getDatabaseProvider(): IDatabaseProvider {
  const dbType = config.DATABASE_TYPE || 'sqlite';
  const connectionString = config.DATABASE_URL || 'file:../wallet.sqlite';
  if (dbType === 'postgres') {
    return new PostgresDatabaseProvider(connectionString);
  }
  return new SqliteDatabaseProvider(connectionString);
}

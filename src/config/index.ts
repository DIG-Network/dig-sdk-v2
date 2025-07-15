
interface DigConfig {
  DIG_FOLDER_PATH: string;
  BLOCKCHAIN: 'chia' | 'test';
  BLOCKCHAIN_NETWORK: 'mainnet' | 'testnet';
  DATABASE_TYPE?: 'sqlite' | 'postgres';
  DATABASE_URL?: string;
}

const config: DigConfig = {
  DIG_FOLDER_PATH: '.dig',
  BLOCKCHAIN: 'chia',
  BLOCKCHAIN_NETWORK: 'testnet',
  DATABASE_TYPE: 'sqlite',
  DATABASE_URL: 'file:../wallet.sqlite',
};

export default config;
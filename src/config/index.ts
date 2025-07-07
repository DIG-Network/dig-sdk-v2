interface DigConfig {
  DIG_FOLDER_PATH: string;
  BLOCKCHAIN: 'chia' | 'test',
  BLOCKCHAIN_NETWORK?: 'mainnet' | 'testnet';
}

const config: DigConfig = {
  DIG_FOLDER_PATH: '.dig',
  BLOCKCHAIN: 'chia',
  BLOCKCHAIN_NETWORK: 'mainnet',
};

export default config;
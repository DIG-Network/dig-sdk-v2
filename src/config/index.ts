interface DigConfig {
  DIG_FOLDER_PATH: string;
  BLOCKCHAIN: string,
  BLOCKCHAIN_NETWORK?: 'mainnet' | 'testnet'; // Optional field for blockchain network
}

const config: DigConfig = {
  DIG_FOLDER_PATH: '.dig',
  BLOCKCHAIN: 'chia',
  BLOCKCHAIN_NETWORK: 'mainnet',
};

export default config;
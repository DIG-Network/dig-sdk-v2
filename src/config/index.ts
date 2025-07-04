interface DigConfig {
  DIG_FOLDER_PATH: string;
  BLOCKCHAIN_NETWORK?: 'mainnet' | 'testnet'; // Optional field for blockchain network
}

const config: DigConfig = {
  DIG_FOLDER_PATH: '.dig',
  BLOCKCHAIN_NETWORK: 'mainnet',
};

export default config;
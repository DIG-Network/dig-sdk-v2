import { PeerType, Tls } from '@dignetwork/datalayer-driver';
import { CoinIndexer } from '../src/application/workers/CoinIndexer/CoinIndexer';
import { BlockChainType } from '../src/application/types/BlockChain';
import { WalletService } from '../src/application/services/WalletService';
import { CoinRepository } from '../src/infrastructure/Repositories/CoinRepository';
import config from '../src/config';

async function main() {
  const testnetWalletAddress = "dev";
  const testnetMnemonic = ""; // Replace with your actual mnemonic
  const walletDbPath = "wallet.sqlite";
  const coinRepository = new CoinRepository();
  // You must have ca.crt and ca.key in your working directory or adjust the path
  const tls = new Tls('ca.crt', 'ca.key');
  config.BLOCKCHAIN_NETWORK = 'testnet';
  try {
    console.log('Initial coins in db:');
    coinRepository.getAllCoins().forEach((coin) => {
      console.log(`Coin ID: ${coin.coinId.toString('hex')}, Amount: ${coin.amount}, Status: ${coin.status}, Wallet ID: ${coin.walletId}`);;
    });

    const coinIndexer = new CoinIndexer();

    // This starts the CoinIndexer worker and connects to the testnet chia blockchain
    await coinIndexer.start(BlockChainType.Chia, 24, 'ca.crt', 'ca.key', PeerType.Testnet11);

    const wallets = WalletService.getAddresses();

    let wallet;
    if (!wallets.map((wallet => wallet.name)).includes(testnetWalletAddress)) {
        wallet = await WalletService.createAddress(testnetWalletAddress, testnetMnemonic);
        console.log(`Wallet ${testnetWalletAddress} added to DB and keyring.`);
    } else {
        wallet = await WalletService.createAddress(testnetWalletAddress);
        console.log(`Wallet ${testnetWalletAddress} loading existing.`);
    }

    // do a while ininitely that waits for one second each time
    while (true) {
      console.log('-------------------------------------------------');
      console.log(`Fetching coins from repository at the time ${new Date()}:`);
      coinRepository.getAllCoins().forEach((coin) => {
        console.log(`Coin ID: ${coin.coinId.toString('hex')}, Amount: ${coin.amount}, Status: ${coin.status}, Wallet ID: ${coin.walletId}`);
      });
      console.log('-------------------------------------------------');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  } catch (e) {
    console.error('Error during execution:', e);
  }
}

main();
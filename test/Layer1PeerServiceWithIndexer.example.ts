import { Layer1PeerService } from '../src/application/services/Layer1PeerService';
import { PeerType, Tls } from '@dignetwork/datalayer-driver';
import { ChiaBlockchainService } from '../src/infrastructure/BlockchainServices/ChiaBlockchainService';
import { CoinIndexer } from '../src/application/workers/CoinIndexer/CoinIndexer';
import { BlockChainType } from '../src/application/types/BlockChain';
import { WalletService } from '../src/application/services/WalletService';
import { CoinRepository } from '../src/application/repositories/CoinRepository';
import Database from 'better-sqlite3';
import { WalletRepository } from '../src/application/repositories/WalletRepository';

async function main() {
  const testnetWalletAddress = "dev";
  const testnetMnemonic = ""; // Replace with your actual mnemonic or generate a new one
  const walletDbPath = "wallet.sqlite";
  const walletDb = new Database(walletDbPath)
  const walletService = new WalletService(walletDbPath);
  const coinRepository = new CoinRepository(walletDb);
  // You must have ca.crt and ca.key in your working directory or adjust the path
  const tls = new Tls('ca.crt', 'ca.key');
  try {
    console.log('Initial coins in db:');
    coinRepository.getAllCoins().forEach((coin) => {
      console.log(`Coin ID: ${coin.coinId.toString('hex')}, Amount: ${coin.amount}, Status: ${coin.status}, Wallet ID: ${coin.walletId}`);;
    });

    const coinIndexer = new CoinIndexer();

    // This starts the CoinIndexer worker and connects to the testnet chia blockchain
    await coinIndexer.start(BlockChainType.Chia, walletDbPath, 1, 'ca.crt', 'ca.key', PeerType.Testnet11);

    const wallets = await walletService.listWallets();

    let wallet;
    if (!wallets.map((wallet => wallet.name)).includes(testnetWalletAddress)) {
        wallet = await walletService.createNewWallet(testnetWalletAddress, PeerType.Testnet11, testnetMnemonic);
        console.log(`Wallet ${testnetWalletAddress} added to DB and keyring.`);
    } else {
        wallet = await walletService.loadWallet(testnetWalletAddress);
        console.log(`Wallet ${testnetWalletAddress} loading existing.`);
    }

    // do a while ininitely that waits for one second each time
    while (true) {
      console.log('-------------------------------------------------');
      console.log('Fetching coins from repository:');
      coinRepository.getAllCoins().forEach((coin) => {
        console.log(`Coin ID: ${coin.coinId.toString('hex')}, Amount: ${coin.amount}, Status: ${coin.status}, Wallet ID: ${coin.walletId}`);
      });
      console.log('-------------------------------------------------');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  } catch (e) {
    console.error('Failed to connect or query peer:', e);
  }
}

main();
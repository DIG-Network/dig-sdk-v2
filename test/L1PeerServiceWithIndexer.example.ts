import { CoinIndexer } from '../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { ChiaWallet } from '../src/infrastructure/types/ChiaWallet';
import { ChiaColdWallet } from '../src/infrastructure/types/ChiaColdWallet';
import { ChiaWalletEventNames, ChiaColdWalletEventNames } from '../src/infrastructure/types/ChiaWalletEvents';
import { WalletService } from '../src/application/services/WalletService';
import config from '../src/config';
import { BlockchainNetwork } from '../src/config/types/BlockchainNetwork';
import { Wallet } from '../src/application/types/Wallet';

async function main() {
  const testnetWalletAddressName = 'dev'; // Replace with your actual address
  const testnetMnemonic = ''; // Replace with your actual mnemonic
  const testnetWalletAddress = 'txch1fw0lql9h6n9e23yzq8ewg0hnjw2gcftayzrnj6rxlx0q6w7x6klsfy5z5f'; // Replace with your actual address

  config.BLOCKCHAIN_NETWORK = BlockchainNetwork.TESTNET;
  
  let coinIndexer = new CoinIndexer();
  coinIndexer.start();

  // const addresses = await WalletService.getWallets();

  // let wallet: Wallet;
  // if (!addresses.map((address) => address.name).includes(testnetWalletAddressName)) {
  //   wallet = await WalletService.createWallet(testnetWalletAddressName, testnetMnemonic);
  //   console.log(`Address ${testnetWalletAddressName} added to DB and keyring.`);
  // } else {
  //   wallet = await WalletService.loadWallet(testnetWalletAddressName);
  //   console.log(`Address ${testnetWalletAddressName} loading existing.`);
  // }
  const coldWallet = new ChiaColdWallet(testnetWalletAddress, coinIndexer);
  const chiaWallet = new ChiaWallet(testnetMnemonic, coinIndexer);

  // Subscribe to ChiaWallet events
  chiaWallet.on(ChiaWalletEventNames.CoinCreated, (coin) => {
    console.log(`[ChiaWallet] Coin created: ID ${coin.coinId}, Amount ${coin.amount}`);
  });
  chiaWallet.on(ChiaWalletEventNames.SpendCreated, (spend) => {
    console.log(`[ChiaWallet] Coin spent: ID ${spend.coinId}, PuzzleReveal ${spend.puzzleReveal}`);
  });

  // Subscribe to ChiaColdWallet events
  coldWallet.on(ChiaColdWalletEventNames.CoinCreated, (coin) => {
    console.log(`[ChiaColdWallet] Coin created: ID ${coin.coinId}, Amount ${coin.amount}`);
  });
  coldWallet.on(ChiaColdWalletEventNames.SpendCreated, (spend) => {
    console.log(`[ChiaColdWallet] Coin spent: ID ${spend.coinId}, PuzzleReveal ${spend.puzzleReveal}`);
  });

  // Still log CoinIndexer events for reference
  // coinIndexer.onCoinCreated((event) => {
  //   console.log(`[CoinIndexer] Coin created: ID ${event.coinId}, Amount ${event.amount}`);
  // });
  // coinIndexer.onSpendCreated((event) => {
  //   console.log(`[CoinIndexer] Coin spent: ID ${event.coinId}, Amount ${event.puzzleReveal}`);
  // });
  coinIndexer.onNewBlockIngested((event) => {
    console.log(`[CoinIndexer] New block ingested: Height ${event.height}, Weight ${event.weight}, HeaderHash ${event.headerHash.toString('hex')}`);
    if (event.timestamp) {
      console.log(`[CoinIndexer] Timestamp: ${event.timestamp}`);
    }
  });
}

main();

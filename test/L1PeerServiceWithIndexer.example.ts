import { CoinIndexer, CoinIndexerEventNames } from '../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { ChiaWallet } from '../src/infrastructure/types/ChiaWallet';
import { ChiaColdWallet } from '../src/infrastructure/types/ChiaColdWallet';
import { ChiaWalletEventNames, ChiaColdWalletEventNames } from '../src/infrastructure/types/ChiaWalletEvents';
import { WalletService } from '../src/application/services/WalletService';
import config from '../src/config';
import { BlockchainNetwork } from '../src/config/types/BlockchainNetwork';
import { Wallet } from '../src/application/types/Wallet';
import { ColdWallet } from '../src/application/types/ColdWallet';
import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';

async function main() {
  const testnetWalletAddressName = 'dev'; // Replace with your actual address name
  const testnetMnemonic = ''; // Replace with your actual mnemonic
  const testnetWalletAddress = 'txch1fw0lql9h6n9e23yzq8ewg0hnjw2gcftayzrnj6rxlx0q6w7x6klsfy5z5f'; // Replace with your actual address

  config.BLOCKCHAIN_NETWORK = BlockchainNetwork.TESTNET;

  const coinIndexer = new CoinIndexer();
  coinIndexer.start();

  // Use WalletService to create or load a hot wallet
  let wallet: Wallet | undefined;
  let coldWallet: ColdWallet | undefined;
  const addresses = await WalletService.getWallets();

  // Hot wallet
  if (!addresses.map((address) => address.name).includes(testnetWalletAddressName)) {
    const created = await WalletService.createWallet(testnetWalletAddressName, testnetMnemonic);
    if ('mnemonic' in created) {
      wallet = created;
      console.log(`Address ${testnetWalletAddressName} added to DB and keyring.`);
    }
  } else {
    const loaded = await WalletService.loadWallet(testnetWalletAddressName);
    if (loaded && 'mnemonic' in loaded) {
      wallet = loaded;
      console.log(`Address ${testnetWalletAddressName} loading existing.`);
    }
  }

  // Cold wallet
  const coldWalletName = 'dev-cold'; // Replace with your cold wallet name
  if (!addresses.map((address) => address.name).includes(coldWalletName)) {
    const created = await WalletService.createColdWallet(coldWalletName, testnetWalletAddress);
    if ('address' in created) {
      coldWallet = created;
      console.log(`Cold wallet ${coldWalletName} added to DB.`);
    }
  } else {
    const loaded = await WalletService.loadWallet(coldWalletName);
    if (loaded && 'address' in loaded) {
      coldWallet = loaded;
      console.log(`Cold wallet ${coldWalletName} loading existing.`);
    }
  }

  // Instantiate ChiaWallet and ChiaColdWallet using the loaded wallet entities and CoinIndexer
  const chiaWallet = wallet ? new ChiaWallet(wallet, coinIndexer) : undefined;
  const chiaColdWallet = coldWallet ? new ChiaColdWallet(coldWallet, coinIndexer) : undefined;


  // Subscribe to ChiaWallet events
  if (chiaWallet) {
    chiaWallet.on(ChiaWalletEventNames.CoinCreated, (coin: CoinRecord) => {
      console.log(`[ChiaWallet] Coin created: hash ${coin.puzzleHash}, Amount ${coin.amount}`);
    });
    chiaWallet.on(ChiaWalletEventNames.SpendCreated, (spend: CoinSpend) => {
      console.log(`[ChiaWallet] Coin spent: hash ${spend.coin.puzzleHash}, Amount ${spend.coin.amount}`);
    });
  }

  // Subscribe to ChiaColdWallet events
  if (chiaColdWallet) {
    chiaColdWallet.on(ChiaColdWalletEventNames.CoinCreated, (coin: CoinRecord) => {
      console.log(`[ChiaColdWallet] Coin created: hash ${coin.puzzleHash}, Amount ${coin.amount}`);
    });
    chiaColdWallet.on(ChiaColdWalletEventNames.SpendCreated, (spend: CoinSpend) => {
      console.log(`[ChiaColdWallet] Coin spent: hash ${spend.coin.puzzleHash}, Amount ${spend.coin.amount}`);
    });
  }


  coinIndexer.on(CoinIndexerEventNames.NewBlockIngested, (event) => {
    console.log(`[CoinIndexer] New block ingested: Height ${event.height}, Weight ${event.weight}, HeaderHash ${event.headerHash.toString('hex')}`);
    if (event.timestamp) {
      console.log(`[CoinIndexer] Timestamp: ${event.timestamp}`);
    }
  });

  coinIndexer.on(CoinIndexerEventNames.CatSpend, (coin) => {
    console.log(`[CoinIndexer] CAT spend detected: coin`, coin);
  });

  coinIndexer.on(CoinIndexerEventNames.NftSpend, (coin) => {
    console.log(`[CoinIndexer] NFT spend detected: coin`, coin);
  });
}

main();

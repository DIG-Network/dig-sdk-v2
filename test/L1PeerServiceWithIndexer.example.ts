import { PeerType } from '@dignetwork/datalayer-driver';
import { CoinIndexer } from '../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { BlockChainType } from '../src/application/types/BlockChain';
import config from '../src/config';
import { Wallet } from '../src/application/types/Wallet';
import { WalletService } from '../src/application/services/WalletService';

async function main() {
  const testnetWalletAddress = 'dev';
  const testnetMnemonic =
    ''; // Replace with your actual mnemonic
  // You must have ca.crt and ca.key in your working directory or adjust the path
  config.BLOCKCHAIN_NETWORK = 'testnet';
  try {
    const coinIndexer = new CoinIndexer();

    // This starts the CoinIndexer worker and connects to the testnet chia blockchain
    await coinIndexer.start(BlockChainType.Chia, 24, 'ca.crt', 'ca.key', PeerType.Testnet11);

    const addresses = await WalletService.getWallets();

    let wallet: Wallet;
    if (!addresses.map((address) => address.name).includes(testnetWalletAddress)) {
      wallet = await WalletService.createWallet(testnetWalletAddress, testnetMnemonic);
      console.log(`Address ${testnetWalletAddress} added to DB and keyring.`);
    } else {
      wallet = await WalletService.loadWallet(testnetWalletAddress);
      console.log(`Address ${testnetWalletAddress} loading existing.`);
    }

    // do a while ininitely that waits for one second each time
    while (true) {
      console.log('-------------------------------------------------');
      let balance = await wallet.getBalance('xch');
      console.log(`Balance for address ${testnetWalletAddress}: ${balance.balance} ${balance.assetId}`);
      console.log('-------------------------------------------------');
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  } catch (e) {
    console.error('Error during execution:', e);
  }
}

main();

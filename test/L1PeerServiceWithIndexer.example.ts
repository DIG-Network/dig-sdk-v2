import { CoinIndexer } from '../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import config from '../src/config';
import { BlockchainNetwork } from '../src/config/types/BlockchainNetwork';

async function main() {
  const testnetWalletAddress = 'dev';
  const testnetMnemonic =
    ''; // Replace with your actual mnemonic
  // You must have ca.crt and ca.key in your working directory or adjust the path
  // try {
  //   const coinIndexer = new CoinIndexer();

  //   await coinIndexer.start(BlockChainType.Chia, 24, 'ca.crt', 'ca.key', PeerType.Testnet11);

    // const addresses = await WalletService.getWallets();

    // let wallet: Wallet;
    // if (!addresses.map((address) => address.name).includes(testnetWalletAddress)) {
    //   wallet = await WalletService.createWallet(testnetWalletAddress, testnetMnemonic);
    //   console.log(`Address ${testnetWalletAddress} added to DB and keyring.`);
    // } else {
    //   wallet = await WalletService.loadWallet(testnetWalletAddress);
    //   console.log(`Address ${testnetWalletAddress} loading existing.`);
    // }

  //   const tls = new Tls('ca.crt', 'ca.key');
  //   await L1PeerService.connect(5, 10, PeerType.Testnet11, tls);

  //   // Send 0.01 xch every 1 minute to a recipient
  //   const recipientAddress = 'txch1qcf59ph8tsxaa58r2zfwhcse7f52etwcct33xwn9s6aa7v8ulj6qhque3x'; // Set this variable as needed

  //   try {
  //     await wallet.spendBalance(BigInt(1500000000000), recipientAddress); // 0.01 xch = 10,000,000 mojos
  //     console.log(`Sent 1.5 xch to ${recipientAddress}`);
  //   } catch (e) {
  //     console.error('Send failed:', e);
  //   }

  //   // do a while ininitely that waits for one second each time
  //   while (true) {
  //     console.log('-------------------------------------------------');
  //     let balance = await wallet.getBalance('xch');
  //     console.log(
  //       `Balance for address ${testnetWalletAddress}: ${balance.balance} ${balance.assetId}`,
  //     );
  //     console.log('-------------------------------------------------');
  //     await new Promise((resolve) => setTimeout(resolve, 60000)); // 1 minute
  //   }
  // } catch (e) {
  //   console.error('Error during execution:', e);
  // }

  config.BLOCKCHAIN_NETWORK = BlockchainNetwork.TESTNET;
  // config.DATABASE_TYPE = 'postgres';
  // config.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/postgres';
  let coinIndexer = new CoinIndexer();
  coinIndexer.start();

  coinIndexer.onCoinCreated((event) => {
    console.log(`Coin created: ID ${event.coinId}, Amount ${event.amount}`);
  });

  coinIndexer.onSpendCreated((event) => {
    console.log(`Coin spent: ID ${event.coinId}, Amount ${event.puzzleReveal}`);
  });

  coinIndexer.onNewBlockIngested((event) => {
    console.log(`New block ingested: Height ${event.height}, Weight ${event.weight}, HeaderHash ${event.headerHash.toString('hex')}`);
    if (event.timestamp) {
      console.log(`Timestamp: ${event.timestamp}`);
    }
  });
}

main();

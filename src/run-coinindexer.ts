import { WalletService } from "./application/services/WalletService";
import { Peer, PeerType, Tls } from "@dignetwork/datalayer-driver";

async function main() {
  // Add your testnet wallet address and mnemonic here
  const testnetWalletAddress = "dev";
  const testnetMnemonic = "";
  const walletDbPath = "wallet.sqlite";

  // Add the wallet to the DB and keyring if not present
  const wallets = await WalletService.listWallets(walletDbPath);
  if (!wallets.includes(testnetWalletAddress)) {
    let wallet = await WalletService.createNewWallet(testnetWalletAddress, walletDbPath, testnetMnemonic);
    console.log(`Wallet ${testnetWalletAddress} added to DB and keyring.`);
    const tls = new Tls('ca.crt', 'ca.key');
    let peer = await Peer.connectRandom(PeerType.Testnet11, tls);
    await wallet.selectUnspentCoins(peer, 100000n, 0n); // Ensure coins are selected
  } else {
        let wallet = await WalletService.loadWallet(testnetWalletAddress);
    console.log(`Wallet ${testnetWalletAddress} added existing.`);
    const tls = new Tls('ca.crt', 'ca.key');
    let peer = await Peer.connectRandom(PeerType.Testnet11, tls);
    await wallet.selectUnspentCoins(peer, 100000n, 0n); // Ensure coins are selected
    console.log(`Wallet ${testnetWalletAddress} already exists in DB.`);
  }

  // Start the CoinIndexer
  // const coinIndexer = new CoinIndexer();
  // const dbPath = './coin_indexer.sqlite';
  // await coinIndexer.start(BlockChainType.Chia, dbPath);
  // console.log('CoinIndexer started.');

  // // Optionally listen for events
  // coinIndexer.onCoinStateUpdated((event) => {
  //   console.log('Coin state updated:', event);
  // });

  // // Keep running
  // process.on('SIGINT', async () => {
  //   console.log('Stopping CoinIndexer...');
  //   await coinIndexer.stop();
  //   process.exit(0);
  // });
}

main().catch((err) => {
  console.error('Error starting CoinIndexer:', err);
  process.exit(1);
});

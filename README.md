# DIG SDK v2 Example: Coin Indexer with L1PeerService

This example demonstrates how to use the CoinIndexer and L1PeerService to sync and monitor coins from the Chia blockchain using the DIG SDK v2.

## Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (v9+ recommended)
- Access to the Chia testnet or mainnet (for real blockchain data)
- The following files in your project root:
  - `ca.crt` and `ca.key` (Chia network certificates, required for peer connections)

## Setup

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Build the project**

   ```sh
   npm run build
   ```

3. **Configure your wallet**

   - Open `test/L1PeerServiceWithIndexer.example.ts`.
   - Set `testnetMnemonic` to your testnet mnemonic phrase.
   - Set `testnetWalletAddress` to a unique name for your wallet (e.g., `"dev"`).
   - Ensure `ca.crt` and `ca.key` are present in your project root, or update the paths in the example file.

4. **Run the example**

   ```sh
   npx prisma db push
   ```

   ```sh
   npx ts-node ./test/L1PeerServiceWithIndexer.example.ts
   ```

   - The script will:
     - Connect to the Chia testnet using L1PeerService.
     - Create or load a wallet and add it to the local database and keyring.
     - Make a transaction by sending txch
     - Run the indexer which will fetch all coins for the wallet.
     - Periodically print all coins in the local database, showing their status and wallet association.

## Notes

- The example will run indefinitely, printing coin data every 10 seconds. Stop it with `Ctrl+C`.
- You can adjust the polling interval or other parameters in the example script.

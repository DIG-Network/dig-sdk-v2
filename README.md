# DIG SDK v2 – Chia Coin Indexer Example

This project demonstrates how to use the DIG SDK v2 to index, monitor, and interact with Chia blockchain coins using the `CoinIndexer`, `ChiaWallet`, `ChiaColdWallet`, and `WalletService` abstractions.

## Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (v9+ recommended)
- Access to the Chia testnet or mainnet (for real blockchain data)

## Setup for local example

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Configure your wallets**

   - Open `test/L1PeerServiceWithIndexer.example.ts`.
   - Set `testnetMnemonic` to your testnet mnemonic phrase (for hot wallet).
   - Set `testnetWalletAddressName` to a unique name for your wallet (e.g., `"dev"`).
   - Set `testnetWalletAddress` to your Chia address (for cold wallet).
   - Optionally, set `coldWalletName` for your cold wallet entry.

3. **Run the example**

   ```sh
   npx ts-node ./test/L1PeerServiceWithIndexer.example.ts
   ```

   The script will:

   - Connect to the Chia testnet using the CoinIndexer and peer services.
   - Create or load a hot wallet (mnemonic-based) and a cold wallet (address-based) using `WalletService`.
   - Instantiate `ChiaWallet` and `ChiaColdWallet` wrappers for event-driven coin monitoring.
   - Subscribe to coin creation and spend events for both wallet types.
   - Periodically print all coins in the local database, showing their status and wallet association.

## Key Concepts

- **CoinIndexer**: Listens to the Chia blockchain, ingests new blocks, and emits events for coin creation and spending.
- **ChiaWallet**: Hot wallet abstraction (mnemonic-based) that emits events for coins belonging to the wallet.
- **ChiaColdWallet**: Cold wallet abstraction (address-based) for monitoring coins without private keys.
- **WalletService**: Utility for creating, loading, and managing wallets and cold wallets.

## Example Usage

See `test/L1PeerServiceWithIndexer.example.ts` for a full example. Key steps:

```typescript
import { CoinIndexer } from '../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { WalletService } from '../src/application/services/WalletService';
import { ChiaWallet } from '../src/infrastructure/types/ChiaWallet';
import { ChiaColdWallet } from '../src/infrastructure/types/ChiaColdWallet';
// ...

const coinIndexer = new CoinIndexer();
await coinIndexer.start();

const wallet = await WalletService.createWallet('dev', testnetMnemonic);
const coldWallet = await WalletService.createColdWallet('dev-cold', testnetWalletAddress);

const chiaWallet = new ChiaWallet(wallet, coinIndexer);
const chiaColdWallet = new ChiaColdWallet(coldWallet, coinIndexer);

chiaWallet.on('chiaCoinCreated', (coin) => console.log('[ChiaWallet] Coin created', coin));
chiaColdWallet.on('chiaCoinCreated', (coin) => console.log('[ChiaColdWallet] Coin created', coin));
// ...
```

## Notes

- The example runs indefinitely, printing coin data every 10 seconds. Stop it with `Ctrl+C`.
- You can adjust the polling interval and other parameters in the example script.
- The codebase supports both testnet and mainnet. Set `config.BLOCKCHAIN_NETWORK` as needed.

## Testing

Run all tests:

```sh
npm test
```

## Project Structure

- `src/` – SDK source code
- `test/` – Example and test scripts
- `ca.crt`, `ca.key` – Chia network certificates (required for peer connections)

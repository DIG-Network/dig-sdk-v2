import Database from 'better-sqlite3';
import { api as coinIndexerApi } from '../../../../src/application/workers/CoinIndexer/CoinIndexer.worker.logic';
import { CoinStateUpdatedEvent } from '../../../../src/application/workers/CoinIndexer/CoinIndexerEvents';
import { CoinRepository } from '../../../../src/application/repositories/CoinRepository';
import { WalletRepository } from '../../../../src/application/repositories/WalletRepository';
import type { IBlockchainService } from '../../../../src/application/interfaces/IBlockChainService';
import type { Peer, Coin } from '@dignetwork/datalayer-driver';

describe('CoinIndexer.worker.logic', () => {
  const dbPath = ':memory:';
  let db: Database.Database;
  let coinRepo: CoinRepository;
  let walletRepo: WalletRepository;
  let mockService: IBlockchainService;
  let mockPeer: Peer;

  beforeEach(async () => {
    coinIndexerApi.__reset();
    db = new Database(dbPath);
    coinRepo = new CoinRepository(db);
    walletRepo = new WalletRepository(db);
    // Add a wallet for tests
    walletRepo.addWallet('xch1234');
    // Mock blockchain service and peer
    mockService = {
      listUnspentCoins: jest.fn().mockResolvedValue({ coins: [] }),
      isCoinSpendable: jest.fn().mockResolvedValue(true),
      // ...other methods can be no-ops
    } as any;
    mockPeer = {} as Peer;
    // If needed, inject mockService and mockPeer into the worker here
    await coinIndexerApi.start('Test', dbPath);
  });

  afterEach(() => {
    coinIndexerApi.stop();
    coinIndexerApi.__reset();
    db.close();
  });

  it('should emit CoinStateUpdated event on sync', async () => {
    // Arrange: mock listUnspentCoins to return a coin
    const coin: Coin = {
      coin_id: Buffer.from('aabbcc', 'hex'),
      parentCoinInfo: Buffer.from('ddeeff', 'hex'),
      puzzleHash: Buffer.from('112233', 'hex'),
      amount: BigInt(1000),
    } as any;
    (mockService.listUnspentCoins as jest.Mock).mockResolvedValue({ coins: [coin] });
    walletRepo.updateWalletSync('xch1234', 10, 'abc');
    const eventPromise = new Promise<void>((resolve) => {
      coinIndexerApi.onCoinStateUpdated((event: CoinStateUpdatedEvent) => {
        expect(event.wallet_id).toBe('xch1234');
        expect(event.status).toBe('unspent');
        resolve();
      });
    });
    // Wait for the interval to trigger sync (simulate passage of time)
    await new Promise((r) => setTimeout(r, 1100));
    await eventPromise;
  });
});

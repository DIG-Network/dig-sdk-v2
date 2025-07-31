import { ColdWallet } from '../../../src/application/types/ColdWallet';
import { WalletService } from '../../../src/application/services/WalletService';

describe('ChiaColdWallet constructor overloads', () => {
  let address: string;
  let walletName: string;
  beforeEach(async () => {
    // Use a unique wallet name for each test
    walletName = `test_chiacoldwallet_overload_${Date.now()}_${Math.floor(Math.random()*10000)}`;
    // Remove keyring file if exists
    const fs = require('fs-extra');
    const path = require('path');
    const keyringPath = path.resolve('.dig/keyring.json');
    if (await fs.pathExists(keyringPath)) {
      await fs.remove(keyringPath);
    }
    const wallet = await WalletService.createWallet(walletName);
    address = await wallet.getOwnerPublicKey();
  });
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(require('fs-extra'), 'readFileSync').mockImplementation((...args: unknown[]) => {
      const filePath = args[0] as string;
      if (filePath && filePath.toString().includes('keyring.json')) {
        return JSON.stringify({ wallets: [] });
      }
      return '';
    });
    jest.spyOn(require('fs-extra'), 'readJsonSync').mockImplementation((...args: unknown[]) => {
      const filePath = args[0] as string;
      if (filePath && filePath.toString().includes('keyring.json')) {
        return { wallets: [] };
      }
      return {};
    });
  });

  it('can be constructed from address', () => {
    const chiaCold = new ChiaColdWallet(address);
    expect(chiaCold.getAddress()).toBe(address);
  });

  it('can be constructed from ColdWallet', () => {
    const base = new ColdWallet(address);
    const chiaCold = new ChiaColdWallet(base);
    expect(chiaCold.getAddress()).toBe(address);
  });

  it('can be constructed from address and CoinIndexer', () => {
    const coinIndexer = new CoinIndexer();
    const chiaCold = new ChiaColdWallet(address, coinIndexer);
    expect(chiaCold.getAddress()).toBe(address);
  });

  it('can be constructed from ColdWallet and CoinIndexer', () => {
    const base = new ColdWallet(address);
    const coinIndexer = new CoinIndexer();
    const chiaCold = new ChiaColdWallet(base, coinIndexer);
    expect(chiaCold.getAddress()).toBe(address);
  });
});


import { ChiaColdWallet } from '../../../src/infrastructure/types/ChiaColdWallet';
import { CoinIndexer, CoinIndexerEventNames } from '../../../src/infrastructure/Workers/CoinIndexer/CoinIndexer';
import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { ChiaBlockchainService } from '../../../src/infrastructure/BlockchainServices/ChiaBlockchainService';
import { ChiaWalletEventNames } from '../../../src/infrastructure/types/ChiaWalletEvents';

describe('ChiaColdWallet', () => {
  let TEST_ADDRESS: string;
  let coinIndexer: CoinIndexer;
  let wallet: ChiaColdWallet;
  let walletName: string;

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.spyOn(ChiaBlockchainService, 'getPuzzleHash').mockReturnValue(Buffer.from('aabbcc', 'hex'));
    // Use a unique wallet name for each test
    walletName = `test_chiacoldwallet_${Date.now()}_${Math.floor(Math.random()*10000)}`;
    // Remove keyring file if exists
    const fs = require('fs-extra');
    const path = require('path');
    const keyringPath = path.resolve('.dig/keyring.json');
    if (await fs.pathExists(keyringPath)) {
      await fs.remove(keyringPath);
    }
    const created = await WalletService.createWallet(walletName);
    TEST_ADDRESS = await created.getOwnerPublicKey();
    coinIndexer = new CoinIndexer(1);
    wallet = new ChiaColdWallet(TEST_ADDRESS, coinIndexer);
  });

  it('should initialize with address and subscribe to events', () => {
    expect(wallet).toBeInstanceOf(ChiaColdWallet);
  });

  it('should emit CoinCreated when matching puzzleHash', (done) => {
    const coin: CoinRecord = {
      parentCoinInfo: 'aabbcc',
      puzzleHash: wallet['chiaPuzzleHash']?.toString('hex') || '',
      amount: '123',
    };
    wallet.on(ChiaWalletEventNames.CoinCreated, (c) => {
      expect(c).toEqual(coin);
      done();
    });
    coinIndexer.emit(CoinIndexerEventNames.CoinCreated, coin);
  });

  it('should emit SpendCreated when matching puzzleHash', (done) => {
    const spend: CoinSpend = {
      coin: {
        parentCoinInfo: 'aabbcc',
        puzzleHash: wallet['chiaPuzzleHash']?.toString('hex') || '',
        amount: '123',
      },
      puzzleReveal: '',
      solution: '',
      offset: 0,
    };
    wallet.on(ChiaWalletEventNames.SpendCreated, (s) => {
      expect(s).toEqual(spend);
      done();
    });
    coinIndexer.emit(CoinIndexerEventNames.SpendCreated, spend);
  });
});

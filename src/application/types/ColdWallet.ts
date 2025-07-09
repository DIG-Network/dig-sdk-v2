import config from '../../config';
import { ChiaBlockchainService } from '../../infrastructure/BlockchainServices/ChiaBlockchainService';
import { ChiaBalanceRepository } from '../../infrastructure/Repositories/ChiaBalanceRepository';
import type { IBlockchainService } from '../../infrastructure/BlockchainServices/IBlockChainService';
import { IBalanceRepository } from '../repositories/Interfaces/IBalanceRepository';
import { IAssetBalance } from './AssetBalance';

export interface IColdWallet {
  getBalance(assetId: string): Promise<IAssetBalance>
  getBalances(): Promise<IAssetBalance[]>

  getPuzzleHash(): Promise<Buffer>;
  masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer;
  masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer;
}

export class ColdWallet implements IColdWallet {
  private blockchain: IBlockchainService;
  private balanceRepository: IBalanceRepository;
  private address: string;

  constructor(address: string) {
    this.address = address;

    switch (config.BLOCKCHAIN) {
      case 'chia':
      default:
        this.blockchain = new ChiaBlockchainService();
        this.balanceRepository = new ChiaBalanceRepository();
        break;
    }
  }

  async getPuzzleHash(): Promise<Buffer> {
    return await this.blockchain.getPuzzleHash(this.address);
  }

  public masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer {
    return this.blockchain.masterPublicKeyToWalletSyntheticKey(publicKey);
  }

  public masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer {
    return this.blockchain.masterPublicKeyToFirstPuzzleHash(publicKey);
  }

  public async getBalance(assetId: string): Promise<IAssetBalance> {
    const balance = this.balanceRepository.getBalance(this.address, assetId);
    return { assetId, balance };
  }

  public async getBalances(): Promise<IAssetBalance[]> {
    return this.balanceRepository.getBalancesByAsset(this.address);
  }
}

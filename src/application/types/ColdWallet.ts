import config from '../../config';
import { ChiaBlockchainService } from '../../infrastructure/BlockchainServices/ChiaBlockchainService';
import { ChiaBalanceRepository } from '../../infrastructure/Repositories/ChiaBalanceRepository';
import type { IBlockchainService } from '../../infrastructure/BlockchainServices/IBlockChainService';
import { IBalanceRepository } from '../repositories/Interfaces/IBalanceRepository';
import { IAssetBalance } from './AssetBalance';
import { EventEmitter } from 'events';

export interface IColdWallet {
  getBalance(assetId: string): Promise<IAssetBalance>

  getPuzzleHash(): Buffer;
  masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer;
  masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer;
}

export class ColdWallet extends EventEmitter implements IColdWallet {
  private blockchain: IBlockchainService;
  private balanceRepository: IBalanceRepository;
  private address: string;

  constructor(address: string) {
    super();
    this.address = address;
    switch (config.BLOCKCHAIN) {
      case 'chia':
      default:
        this.blockchain = new ChiaBlockchainService();
        this.balanceRepository = new ChiaBalanceRepository();
        break;
    }
  }

  getPuzzleHash(): Buffer {
    return ChiaBlockchainService.getPuzzleHash(this.address);
  }

  public masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer {
    return this.blockchain.masterPublicKeyToWalletSyntheticKey(publicKey);
  }

  public masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer {
    return this.blockchain.masterPublicKeyToFirstPuzzleHash(publicKey);
  }

  public async getBalance(assetId: string): Promise<IAssetBalance> {
    const balance = await this.balanceRepository.getBalance(this.address);
    return { assetId, balance };
  }
}

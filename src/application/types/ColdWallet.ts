import config from '../../config';
import { ChiaBlockchainService } from '../../infrastructure/BlockchainServices/ChiaBlockchainService';
import type { IBlockchainService } from '../../infrastructure/BlockchainServices/IBlockChainService';
import { EventEmitter } from 'events';

export interface IColdWallet {
  getPuzzleHash(): Buffer;
  masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer;
  masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer;
}

export class ColdWallet extends EventEmitter implements IColdWallet {
  private blockchain: IBlockchainService;
  private address: string;

  constructor(address: string) {
    super();
    this.address = address;
    switch (config.BLOCKCHAIN) {
      case 'chia':
      default:
        this.blockchain = new ChiaBlockchainService();
        break;
    }
  }

  public getAddress(): string {
    return this.address;
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
}

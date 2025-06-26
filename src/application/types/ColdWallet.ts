import type { Peer, UnspentCoinsResponse } from '@dignetwork/datalayer-driver';
import type { IBlockchainService } from '../interfaces/IBlockChainService';

export interface IColdWallet {
  getPuzzleHash(address: string): Buffer;
  verifyKeySignature(signature: Buffer, publicKey: Buffer, message: Buffer): boolean;
  listUnspentCoins(
    peer: Peer,
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer
  ): Promise<UnspentCoinsResponse>;
  isCoinSpendable(
    peer: Peer,
    coinId: Buffer,
    lastHeight: number,
    headerHash: Buffer
  ): Promise<boolean>;
  masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer;
  masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer;
}

export class ColdWallet implements IColdWallet {
  private blockchain: IBlockchainService;
  constructor(blockchain: IBlockchainService) {
    this.blockchain = blockchain;
  }

  getPuzzleHash(address: string): Buffer {
    return this.blockchain.getPuzzleHash(address);
  }

  verifyKeySignature(signature: Buffer, publicKey: Buffer, message: Buffer): boolean {
    return this.blockchain.verifyKeySignature(signature, publicKey, message);
  }

  async listUnspentCoins(
    peer: Peer,
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer
  ) {
    return await this.blockchain.listUnspentCoins(peer, puzzleHash, previousHeight, previousHeaderHash);
  }

  async isCoinSpendable(
    peer: Peer,
    coinId: Buffer,
    lastHeight: number,
    headerHash: Buffer
  ): Promise<boolean> {
    return await this.blockchain.isCoinSpendable(peer, coinId, lastHeight, headerHash);
  }

  masterPublicKeyToWalletSyntheticKey(publicKey: Buffer): Buffer {
    return this.blockchain.masterPublicKeyToWalletSyntheticKey(publicKey);
  }

  masterPublicKeyToFirstPuzzleHash(publicKey: Buffer): Buffer {
    return this.blockchain.masterPublicKeyToFirstPuzzleHash(publicKey);
  }
}

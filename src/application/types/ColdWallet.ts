import { Peer, UnspentCoinsResponse, addressToPuzzleHash, verifySignedMessage } from '@dignetwork/datalayer-driver';

export interface IColdWallet {
  getPuzzleHash(address: string): Buffer;
  verifyKeySignature(signature: Buffer, publicKey: Buffer, message: Buffer): boolean;
  listUnspentCoins(
    peer: Peer,
    puzzleHash: Buffer,
    previousHeight: number | undefined | null,
    previousHeaderHash: Buffer
  ): Promise<UnspentCoinsResponse>;
  isCoinSpendable(
    peer: Peer,
    coinId: Buffer,
    lastHeight: number | undefined | null,
    headerHash: Buffer
  ): Promise<boolean>;
}

export class ColdWallet implements IColdWallet {
  getPuzzleHash(address: string): Buffer {
    return addressToPuzzleHash(address);
  }

  verifyKeySignature(signature: Buffer, publicKey: Buffer, message: Buffer): boolean {
    return verifySignedMessage(signature, publicKey, message);
  }

  async listUnspentCoins(
    peer: Peer,
    puzzleHash: Buffer,
    previousHeight: number,
    previousHeaderHash: Buffer
  ) {
    return await peer.getAllUnspentCoins(puzzleHash, previousHeight, previousHeaderHash);
  }

  async isCoinSpendable(
    peer: Peer,
    coinId: Buffer,
    lastHeight: number | undefined | null,
    headerHash: Buffer
  ): Promise<boolean> {
    return !(await peer.isCoinSpent(coinId, lastHeight, headerHash));
  }
}

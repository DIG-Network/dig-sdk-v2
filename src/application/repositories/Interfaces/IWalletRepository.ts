import { WalletRow } from '../WalletRepository';

export interface IWalletRepository {
  addWallet(address: string, name: string, namespace?: string): void;
  updateWalletSync(address: string, synced_to_height: number, synced_to_hash: string): void;
  getWallets(): WalletRow[];
}

import { AddressRow } from '../WalletRepository';

export interface IWalletRepository {
  addAddress(address: string, name: string, namespace?: string): Promise<void>;
  updateWalletSync(address: string, synced_to_height: number, synced_to_hash: string): Promise<void>;
  removeWallet(address: string): Promise<void>;
  removeAddressByName(name: string): Promise<void>;
  getAddresses(): Promise<AddressRow[]>;
}

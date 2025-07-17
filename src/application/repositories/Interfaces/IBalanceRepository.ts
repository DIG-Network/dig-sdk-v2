export interface IBalanceRepository {
  getBalance(address: string, assetId: string): Promise<bigint>;
}

export interface IBalanceRepository {
  getBalance(address: string): Promise<bigint>;
}

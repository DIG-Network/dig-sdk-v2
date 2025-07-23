import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { Spend } from '../entities/Spend';
import { ChiaBlockchainService } from '../BlockchainServices/ChiaBlockchainService';
import { Coin } from '@dignetwork/datalayer-driver';
import { PendingCoin } from '../entities/PendingCoin';
import { UnspentCoin } from '../entities/UnspentCoin';

export function mapCoinSpendToSpend(coinSpend: CoinSpend): Spend {
  return {
    coinId: ChiaBlockchainService.getCoinId(mapCoinRecordToDatalayerCoin(coinSpend.coin)).toString(),
    puzzleReveal: Buffer.from(coinSpend.puzzleReveal, 'hex'),
    solution: Buffer.from(coinSpend.solution, 'hex'),
  };
}

export function mapCoinRecordToDatalayerCoin(coinRecord: CoinRecord): Coin {
  return {
    parentCoinInfo: Buffer.from(coinRecord.parentCoinInfo, 'hex'),
    puzzleHash: Buffer.from(coinRecord.puzzleHash, 'hex'),
    amount: BigInt(coinRecord.amount),
  };
}

export function mapCoinRecordToUnspentCoin(coinRecord: CoinRecord): UnspentCoin {
  return {
    coinId: ChiaBlockchainService.getCoinId(mapCoinRecordToDatalayerCoin(coinRecord)).toString('hex'),
    parentCoinInfo: Buffer.from(coinRecord.parentCoinInfo, 'hex'),
    puzzleHash: Buffer.from(coinRecord.puzzleHash, 'hex'),
    amount: coinRecord.amount,
  };
}

export function mapUnspentCoinToDatalayerCoin(unspentCoin: UnspentCoin): Coin {
  return {
    parentCoinInfo: unspentCoin.parentCoinInfo,
    puzzleHash: unspentCoin.puzzleHash,
    amount:
      typeof unspentCoin.amount === 'bigint' ? unspentCoin.amount : BigInt(unspentCoin.amount),
  };
}

export function mapCoinToPendingCoin(coin: Coin, expiresAt: number = 0): PendingCoin {
  return {
    coinId: ChiaBlockchainService.getCoinId(coin).toString('hex'),
    expiresAt: new Date(expiresAt),
  };
}

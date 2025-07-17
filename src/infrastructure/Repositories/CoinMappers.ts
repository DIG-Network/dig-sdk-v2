import { CoinRecord, CoinSpend } from '@dignetwork/chia-block-listener';
import { Spend } from '../entities/Spend';
import { ChiaBlockchainService } from '../BlockchainServices/ChiaBlockchainService';
import { Coin } from '@dignetwork/datalayer-driver';
import { PendingCoin } from '../entities/PendingCoin';

export function mapCoinSpendToSpend(coinSpend: CoinSpend): Spend {
    return {
    coinId: ChiaBlockchainService.getCoinId(mapCoinRecordToDatalayerCoin(coinSpend.coin)).toString(
        'hex',
    ),
    puzzleReveal: coinSpend.puzzleReveal,
    solution: coinSpend.solution,
};
}

export function mapCoinRecordToDatalayerCoin(coinRecord: CoinRecord): Coin {
    return {
        parentCoinInfo: Buffer.from(coinRecord.parentCoinInfo, 'hex'),
        puzzleHash: Buffer.from(coinRecord.puzzleHash, 'hex'),
        amount: BigInt(coinRecord.amount),
    };
}

export function mapUnspentCoinToDatalayerCoin(unspentCoin: {
    parentCoinInfo: string;
    puzzleHash: string;
    amount: string | number | bigint;
}): Coin {
  return {
      parentCoinInfo: Buffer.from(unspentCoin.parentCoinInfo, 'hex'),
    puzzleHash: Buffer.from(unspentCoin.puzzleHash, 'hex'),
    amount:
      typeof unspentCoin.amount === 'bigint' ? unspentCoin.amount : BigInt(unspentCoin.amount),
  };
}

export function mapCoinToPendingCoin(coin: Coin, expirey: number = 0): PendingCoin {
  return {
    coinId: ChiaBlockchainService.getCoinId(coin).toString('hex'),
    expirey: new Date(expirey),
  };
}

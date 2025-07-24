import { CoinRecord } from '@dignetwork/chia-block-listener';
import { Coin } from '@dignetwork/datalayer-driver';


export function mapCoinRecordToDatalayerCoin(coinRecord: CoinRecord): Coin {
  return {
    parentCoinInfo: Buffer.from(coinRecord.parentCoinInfo, 'hex'),
    puzzleHash: Buffer.from(coinRecord.puzzleHash, 'hex'),
    amount: BigInt(coinRecord.amount),
  };
}


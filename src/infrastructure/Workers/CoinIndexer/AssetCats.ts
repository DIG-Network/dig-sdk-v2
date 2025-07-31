
export interface AssetCats {
  assetId: string;
  cats: Cat[];
}

export interface Cat {
  coin?: CatCoin;
  lineageProof?: CatLineageProof;
  info?: CatInfo;
}

export interface CatCoin {
  parentCoinInfo?: string;
  puzzleHash?: string;
  amount?: number;
}

export interface CatLineageProof {
  parent_parent_coin_info?: string;
  parent_inner_puzzle_hash?: string;
  parent_amount?: number;
}

export interface CatInfo {
  assetId?: string;
  p2PuzzleHash?: string;
  innerPuzzleHash?: string;
}

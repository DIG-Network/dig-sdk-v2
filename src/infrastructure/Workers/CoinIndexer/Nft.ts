export interface Nft {
  coin?: NftCoin;
  proof?: NftProof;
  info?: NftInfo;
}

export interface NftCoin {
  parentCoinInfo?: string;
  puzzleHash?: string;
  amount?: string;
}

export interface NftProof {
  parent_parent_coin_info?: string;
  parent_inner_puzzle_hash?: string;
  parent_amount?: string;
}

export interface NftInfo {
  launcherId?: string;
  metadata?: NftMetadata;
  metadataUpdaterPuzzleHash?: string;
  currentOwner?: string | null;
  royaltyPuzzleHash?: string;
  royaltyBasisPoints?: string;
  p2PuzzleHash?: string;
}

export interface NftMetadata {
  editionNumber?: string;
  editionTotal?: string;
  dataUris?: string[];
  dataHash?: string;
  metadataUris?: string[];
  metadataHash?: string;
  licenseUris?: string[];
  licenseHash?: string;
}

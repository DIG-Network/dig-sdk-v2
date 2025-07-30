import {
  Cat as WalletCat,
  Nft as WalletNft,
  Clvm,
  Program,
  Puzzle,
  CoinSpend as WalletCoinSpend,
  toHex,
} from 'chia-wallet-sdk';
import { CoinSpend as ListenerCoinSpend } from '@dignetwork/chia-block-listener';
import { mapListenerCoinSpendToWalletCoinSpend } from './CoinSpendMapper';
import { AssetCats, Cat } from './AssetCats';
import { Nft, NftMetadata } from './Nft';

export function parseNftsFromSpend(coinSpend: ListenerCoinSpend): Nft | null {
  try {
    const {
      puzzle,
      walletCoinSpend,
      solutionProgram,
    }: { puzzle: Puzzle; walletCoinSpend: WalletCoinSpend; solutionProgram: Program } =
      getSolutionAndPuzzle(coinSpend);

    // Try NFT parsing
    try {
      const nftInfo = puzzle.parseChildNft(walletCoinSpend.coin.clone(), solutionProgram.clone());
      if (nftInfo) {
        return parseWalletNftToNft(nftInfo, toHex);
      }
    } catch {}
  } catch {}
  return null;
}

export function parseCatsFromSpend(coinSpend: ListenerCoinSpend): AssetCats | null {
  try {
    const {
      puzzle,
      walletCoinSpend,
      solutionProgram,
    }: { puzzle: Puzzle; walletCoinSpend: WalletCoinSpend; solutionProgram: Program } =
      getSolutionAndPuzzle(coinSpend);

    // Try CAT parsing
    try {
      const catInfo = puzzle.parseChildCats(walletCoinSpend.coin.clone(), solutionProgram.clone());
      if (catInfo && catInfo.length > 0) {
        const cats = catInfo
          .map((cat: WalletCat) => parseWalletCatToCat(cat, toHex))
          .filter((cat): boolean => cat !== null) as Cat[];
        const assetId = cats[0]?.info?.assetId;
        if (assetId) {
          return { assetId, cats };
        }
      }
    } catch {
      // CAT parsing failed
    }
  } catch {}
  return null;
}


export function parseDidFromSpend(coinSpend: ListenerCoinSpend): unknown {
  try {
    const {
      puzzle,
      solutionProgram,
      walletCoinSpend,
    }: { puzzle: Puzzle; walletCoinSpend: WalletCoinSpend; solutionProgram: Program } =
      getSolutionAndPuzzle(coinSpend);

    // Try Did parsing
    try {
      const didInfo = puzzle.parseChildDid(walletCoinSpend.coin.clone(), solutionProgram.clone(), walletCoinSpend.coin.clone());
      if (didInfo) {
        console.log(`Did info found: ${JSON.stringify(didInfo)}`);
      }
    } catch {
    }
  } catch {}
  return null;
}

export function parseClawbackFromSpend(coinSpend: ListenerCoinSpend): unknown {
  try {
    const {
      puzzle,
      solutionProgram,
    }: { puzzle: Puzzle; walletCoinSpend: WalletCoinSpend; solutionProgram: Program } =
      getSolutionAndPuzzle(coinSpend);

    // Try Clawback parsing
    try {
      const clawbackInfo = puzzle.parseChildClawbacks(solutionProgram.clone());
      if (clawbackInfo && clawbackInfo.length > 0) {
        console.log(`Clawback info found: ${JSON.stringify(clawbackInfo)}`);
      }
    } catch {
    }
  } catch {}
  return null;
}

export function parseStreamedCatFromSpend(coinSpend: ListenerCoinSpend): unknown {
  try {
    const {
      puzzle,
      solutionProgram,
      walletCoinSpend,
    }: { puzzle: Puzzle; walletCoinSpend: WalletCoinSpend; solutionProgram: Program } =
      getSolutionAndPuzzle(coinSpend);

    // Try StreamedCat parsing
    try {
      const streamedCatInfo = puzzle.parseChildStreamedCat(walletCoinSpend.coin.clone(), solutionProgram.clone());
      if (streamedCatInfo) {
        console.log(`StreamedCat info found: ${JSON.stringify(streamedCatInfo)}`);
      }
    } catch {
    }
  } catch {}
  return null;
}

function parseWalletNftToNft(nft: WalletNft, toHex: (bytes: Uint8Array) => string): Nft | null {
  if (!nft) {
    return null;
  }
  
  try {
    const result: Nft = {
      coin: undefined,
      proof: undefined,
      info: undefined,
    };
    
    let metadata: NftMetadata | undefined = undefined;

    // Parse coin object
    if (nft.coin) {
      result.coin = {
        parentCoinInfo: nft.coin.parentCoinInfo ? toHex(nft.coin.parentCoinInfo) : undefined,
        puzzleHash: nft.coin.puzzleHash ? toHex(nft.coin.puzzleHash) : undefined,
        amount: nft.coin.amount ? nft.coin.amount.toString() : undefined,
      };
    }
    
    // Parse proof object
    if (nft.proof) {
      result.proof = {
        parent_parent_coin_info: convertUint8ArrayObjectToHex(
          nft.proof.parentParentCoinInfo,
          toHex,
        ),
        parent_inner_puzzle_hash: convertUint8ArrayObjectToHex(
          nft.proof.parentInnerPuzzleHash,
          toHex,
        ),
        parent_amount: nft.proof.parentAmount ? nft.proof.parentAmount.toString() : undefined,
      };
    }

    // Parse info object (NftInfo)
    if (nft.info) {
      const metadataProgram = nft.info.metadata?.clone();
      
      try {
        const nftMetadata = metadataProgram.clone().parseNftMetadata();
        metadata = nftMetadata
        ? {
          editionNumber: nftMetadata.editionNumber?.toString(),
          editionTotal: nftMetadata.editionTotal?.toString(),
          dataUris: nftMetadata.dataUris || [],
          dataHash: nftMetadata.dataHash ? toHex(nftMetadata.dataHash) : undefined,
          metadataUris: nftMetadata.metadataUris || [],
          metadataHash: nftMetadata.metadataHash ? toHex(nftMetadata.metadataHash) : undefined,
          licenseUris: nftMetadata.licenseUris || [],
          licenseHash: nftMetadata.licenseHash ? toHex(nftMetadata.licenseHash) : undefined,
        }
        : undefined;
      } catch {
        metadata = undefined;
      }

      result.info = {
        launcherId: nft.info.launcherId ? toHex(nft.info.launcherId) : undefined,
        metadata: metadata,
        metadataUpdaterPuzzleHash: nft.info.metadataUpdaterPuzzleHash
        ? toHex(nft.info.metadataUpdaterPuzzleHash)
        : undefined,
        currentOwner: nft.info.currentOwner ? toHex(nft.info.currentOwner) : undefined,
        royaltyPuzzleHash: nft.info.royaltyPuzzleHash
        ? toHex(nft.info.royaltyPuzzleHash)
        : undefined,
        royaltyBasisPoints: nft.info.royaltyBasisPoints
        ? nft.info.royaltyBasisPoints.toString()
        : undefined,
        p2PuzzleHash: nft.info.p2PuzzleHash ? toHex(nft.info.p2PuzzleHash) : undefined,
      };
    }
    
    return result;
  } catch {
    return null;
  }
}

function parseWalletCatToCat(cat: WalletCat, toHex: (bytes: Uint8Array) => string): Cat | null {
  if (!cat) {
    return null;
  }
  
  try {
    let result: Cat = {
      coin: undefined,
      lineageProof: undefined,
      info: undefined,
    };
    
    // Parse coin object
    if (cat.coin) {
      result.coin = {
        parentCoinInfo: cat.coin.parentCoinInfo ? toHex(cat.coin.parentCoinInfo) : undefined,
        puzzleHash: cat.coin.puzzleHash ? toHex(cat.coin.puzzleHash) : undefined,
        amount: cat.coin.amount ? Number(cat.coin.amount.toString()) : undefined,
      };
    }

    // Parse lineageProof object
    if (cat.lineageProof) {
      result.lineageProof = {
        parent_parent_coin_info: convertUint8ArrayObjectToHex(
          cat.lineageProof.parentParentCoinInfo,
          toHex,
        ),
        parent_inner_puzzle_hash: convertUint8ArrayObjectToHex(
          cat.lineageProof.parentInnerPuzzleHash,
          toHex,
        ),
        parent_amount: cat.lineageProof.parentAmount
        ? Number(cat.lineageProof.parentAmount.toString())
        : undefined,
      };
    }
    
    // Parse info object (CatInfo)
    if (cat.info) {
      result.info = {
        assetId: cat.info.assetId ? toHex(cat.info.assetId) : undefined,
        p2PuzzleHash: cat.info.p2PuzzleHash ? toHex(cat.info.p2PuzzleHash) : undefined,
        innerPuzzleHash: cat.info.innerPuzzleHash() ? toHex(cat.info.innerPuzzleHash()) : undefined,
      };
    }

    return result;
  } catch {
    return null;
  }
}

function convertUint8ArrayObjectToHex(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any,
  toHex: (bytes: Uint8Array) => string,
): string | undefined {
  if (!obj) return undefined;
  
  if (
    typeof obj === 'object' &&
    obj !== null &&
    !Buffer.isBuffer(obj) &&
    !(obj instanceof Uint8Array)
  ) {
    const keys = Object.keys(obj);
    if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key))) {
      const bytes = new Uint8Array(keys.length);
      for (let i = 0; i < keys.length; i++) {
        bytes[i] = obj[i];
      }
      return toHex(bytes);
    }
  }

  // If it's already a buffer or Uint8Array, convert directly
  if (Buffer.isBuffer(obj) || obj instanceof Uint8Array) {
    return toHex(obj);
  }
  
  return undefined;
}

function getSolutionAndPuzzle(coinSpend: ListenerCoinSpend) {
  const walletCoinSpend: WalletCoinSpend = mapListenerCoinSpendToWalletCoinSpend(coinSpend);
  const clvm = new Clvm();
  const puzzleProgram = clvm.deserialize(walletCoinSpend.puzzleReveal);
  const solutionProgram = clvm.deserialize(walletCoinSpend.solution);
  const puzzle = puzzleProgram.puzzle();
  return { puzzle, walletCoinSpend, solutionProgram };
}
export function convertUint8ArrayObjectToHex(
  obj: any,
  toHex: (bytes: Uint8Array) => string
): string | null {
  if (!obj) return null;

  // Check if it's an object with numeric keys (serialized Uint8Array)
  if (
    typeof obj === "object" &&
    obj !== null &&
    !Buffer.isBuffer(obj) &&
    !(obj instanceof Uint8Array)
  ) {
    const keys = Object.keys(obj);
    if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key))) {
      // Convert object with numeric keys back to Uint8Array
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

  return null;
}

export function parseNftToJson(nft: any, toHex: (bytes: Uint8Array) => string): any {
  if (!nft) {
    return null;
  }

  try {
    const result: any = {};
    let metadata: any = null;

    // Parse coin object
    if (nft.coin) {
      result.coin = {
        parentCoinInfo: nft.coin.parentCoinInfo
          ? toHex(nft.coin.parentCoinInfo)
          : null,
        puzzleHash: nft.coin.puzzleHash ? toHex(nft.coin.puzzleHash) : null,
        amount: nft.coin.amount ? nft.coin.amount.toString() : null,
      };
    }

    // Parse proof object
    if (nft.proof) {
      result.proof = {
        parent_parent_coin_info: convertUint8ArrayObjectToHex(
          nft.proof.parentParentCoinInfo,
          toHex
        ),
        parent_inner_puzzle_hash: convertUint8ArrayObjectToHex(
          nft.proof.parentInnerPuzzleHash,
          toHex
        ),
        parent_amount: nft.proof.parentAmount
          ? nft.proof.parentAmount.toString()
          : null,
      };
    }

    // Parse info object (NftInfo)
    if (nft.info) {
      const metadataProgram = nft.info.metadata?.clone();

      try {
        const nftMetadata = metadataProgram.clone().parseNftMetadata();
        metadata = {
          editionNumber: nftMetadata.editionNumber?.toString(),
          editionTotal: nftMetadata.editionTotal?.toString(),
          dataUris: nftMetadata.dataUris || [],
          dataHash: nftMetadata.dataHash ? toHex(nftMetadata.dataHash) : null,
          metadataUris: nftMetadata.metadataUris || [],
          metadataHash: nftMetadata.metadataHash
            ? toHex(nftMetadata.metadataHash)
            : null,
          licenseUris: nftMetadata.licenseUris || [],
          licenseHash: nftMetadata.licenseHash
            ? toHex(nftMetadata.licenseHash)
            : null,
        };
      } catch (error) {
        metadata = null;
      }

      result.info = {
        launcherId: nft.info.launcherId ? toHex(nft.info.launcherId) : null,
        metadata: metadata,
        metadataUpdaterPuzzleHash: nft.info.metadataUpdaterPuzzleHash
          ? toHex(nft.info.metadataUpdaterPuzzleHash)
          : null,
        currentOwner: nft.info.currentOwner
          ? toHex(nft.info.currentOwner)
          : null,
        royaltyPuzzleHash: nft.info.royaltyPuzzleHash
          ? toHex(nft.info.royaltyPuzzleHash)
          : null,
        royaltyBasisPoints: nft.info.royaltyBasisPoints
          ? nft.info.royaltyBasisPoints.toString()
          : null,
        p2PuzzleHash: nft.info.p2PuzzleHash
          ? toHex(nft.info.p2PuzzleHash)
          : null,
      };
    }

    return result;
  } catch (error: any) {
    return {
      type: "parseNftToJson",
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/* Helper function to parse CAT object and its subclasses to JSON */
export function parseCatToJson(cat: any, toHex: (bytes: Uint8Array) => string): any {
  if (!cat) {
    return null;
  }

  try {
    const result: any = {};

    // Parse coin object
    if (cat.coin) {
      result.coin = {
        parentCoinInfo: cat.coin.parentCoinInfo
          ? toHex(cat.coin.parentCoinInfo)
          : null,
        puzzleHash: cat.coin.puzzleHash ? toHex(cat.coin.puzzleHash) : null,
        amount: cat.coin.amount ? Number(cat.coin.amount.toString()) : null,
      };
    }

    // Parse lineageProof object
    if (cat.lineageProof) {
      result.lineageProof = {
        parent_parent_coin_info: convertUint8ArrayObjectToHex(
          cat.lineageProof.parentParentCoinInfo,
          toHex
        ),
        parent_inner_puzzle_hash: convertUint8ArrayObjectToHex(
          cat.lineageProof.parentInnerPuzzleHash,
          toHex
        ),
        parent_amount: cat.lineageProof.parentAmount
          ? Number(cat.lineageProof.parentAmount.toString())
          : null,
      };
    }

    // Parse info object (CatInfo)
    if (cat.info) {
      result.info = {
        assetId: cat.info.assetId ? toHex(cat.info.assetId) : null,
        p2PuzzleHash: cat.info.p2PuzzleHash
          ? toHex(cat.info.p2PuzzleHash)
          : null,
        innerPuzzleHash: cat.info.innerPuzzleHash()
          ? toHex(cat.info.innerPuzzleHash())
          : null,
      };
    }

    return result;
  } catch (error: any) {
    return {
      type: "parseCatToJson",
      data: null,
      error: error instanceof Error ? error.message : String(error),
      classType: cat.constructor.name,
    };
  }
}

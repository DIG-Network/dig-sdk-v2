import { parseNftToJson, parseCatToJson } from '../../../coin-utils';
import { Cat, Clvm, Program, Puzzle, CoinSpend as WalletCoinSpend, toHex } from 'chia-wallet-sdk';
import { CoinSpend as ListenerCoinSpend } from '@dignetwork/chia-block-listener';
import { mapListenerCoinSpendToWalletCoinSpend } from './CoinSpendMapper';
import { AssetCats } from './AssetCats';

export function parseNftFromSpend(coinSpend: ListenerCoinSpend): unknown {
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
          console.log(`Parsed NFT with nftInfo: ${nftInfo}`);
          console.log(`returned data of the method: ${JSON.stringify(parseNftToJson(nftInfo, toHex))}`);
        return parseNftToJson(nftInfo, toHex);
      }
    } catch {
    }
  } catch {
  }
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
        const cats = catInfo.map((cat: Cat) => parseCatToJson(cat, toHex));
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

function getSolutionAndPuzzle(coinSpend: ListenerCoinSpend) {
  const walletCoinSpend: WalletCoinSpend = mapListenerCoinSpendToWalletCoinSpend(coinSpend);
  const clvm = new Clvm();
  const puzzleProgram = clvm.deserialize(walletCoinSpend.puzzleReveal);
  const solutionProgram = clvm.deserialize(walletCoinSpend.solution);
  const puzzle = puzzleProgram.puzzle();
  return { puzzle, walletCoinSpend, solutionProgram };
}

export function parseDidFromSpend(_coinSpend: ListenerCoinSpend): unknown {
  // TODO: Implement DID parsing logic
  return null;
}

export function parseClawbackFromSpend(_coinSpend: ListenerCoinSpend): unknown {
  // TODO: Implement Clawback parsing logic
  return null;
}

export function parseStreamedCatFromSpend(_coinSpend: ListenerCoinSpend): unknown {
  // TODO: Implement StreamedCat parsing logic
  return null;
}

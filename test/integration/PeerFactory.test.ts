import { CoinSpend, getCoinId, masterPublicKeyToWalletSyntheticKey, masterSecretKeyToWalletSyntheticSecretKey, Peer, PeerType, secretKeyToPublicKey, signCoinSpends, simulatorNewBlspair, simulatorNewProgram, simulatorNewPuzzle, Tls } from '@dignetwork/datalayer-driver';
import * as bip39 from 'bip39';
import { mnemonicToSeedSync } from 'bip39';
import { PrivateKey } from "chia-bls";

describe('Spending wallet coin', () => {
  it('should be able to spend a coin', async () => {
    const tls = new Tls('ca.crt', 'ca.key');
    const peer = await Peer.new('', PeerType.Simulator, tls);

    console.log('Peer created:', peer);
    console.log('Peer peak:', await peer.getPeak());

    // let pair = simulatorNewBlspair(0n);
    const mnemonic = bip39.generateMnemonic(256);

    const seed = mnemonicToSeedSync(mnemonic);
    var masterSecretKey = Buffer.from(PrivateKey.fromSeed(seed).toHex(), "hex");
    var masterSyntheticSecretKey = masterSecretKeyToWalletSyntheticSecretKey(masterSecretKey);
    const masterPublicKey = secretKeyToPublicKey(masterSecretKey);
    var masterSyntheticPublicKey = masterPublicKeyToWalletSyntheticKey(masterPublicKey);

    let puzzle = await simulatorNewPuzzle(1n);
    let coin = await peer.simulatorNewCoin(puzzle.puzzleHash, 1n);

    let solution = simulatorNewProgram(masterSyntheticPublicKey);
    let coinSpends = [{ coin, puzzleReveal: puzzle.puzzleReveal, solution } as CoinSpend];

    const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);

    console.log('Signature:', sig);

    const coinState = await peer.simulatorCoinState(getCoinId(coin));

    console.log('CoinState:', coinState);

    let result = await peer.broadcastSpend(coinSpends, [sig]);

    console.log('Spend result:', result);
    console.log('Peer peak:', await peer.getPeak());
  });
});


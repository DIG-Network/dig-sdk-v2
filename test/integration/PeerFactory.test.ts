import { CoinSpend, getCoinId, Peer, PeerType, signCoinSpends, simulatorNewBlspair, simulatorNewProgram, simulatorNewPuzzle, Tls } from '@dignetwork/datalayer-driver';

describe('Spending wallet coin', () => {
  it('should be able to spend a coin', async () => {
    const tls = new Tls('ca.crt', 'ca.key');
    const peer = await Peer.new('', PeerType.Simulator, tls);

    console.log('Peer created:', peer);
    console.log('Peer peak:', await peer.getPeak());

    let pair = simulatorNewBlspair(0n);
    let puzzle = await simulatorNewPuzzle(1n);
    let coin = await peer.simulatorNewCoin(pair.puzzleHash, 1n);

    let solution = simulatorNewProgram(pair.pk);
    let coinSpends = [{ coin, puzzleReveal: puzzle.puzzleReveal, solution } as CoinSpend];

    const sig = signCoinSpends(coinSpends, [pair.sk], true);

    console.log('Signature:', sig);

    const coinState = await peer.simulatorCoinState(getCoinId(coin));

    console.log('CoinState:', coinState);

    let result = await peer.broadcastSpend(coinSpends, [sig]);

    console.log('Spend result:', result);
    console.log('Peer peak:', await peer.getPeak());
  });
});

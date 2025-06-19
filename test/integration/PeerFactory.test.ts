import { CoinSpend, Peer, PeerType, signCoinSpends, Tls } from '@dignetwork/datalayer-driver';

describe('Spending wallet coin', () => {
  it('should be able to spend a coin', async () => {
    const tls = new Tls('ca.crt', 'ca.key');
    const peer = await Peer.new('', PeerType.Simulator, tls);

    console.log('Peer created:', peer);
    console.log('Peer peak:', await peer.getPeak());

    let pair = await peer.simulatorNewBlspair(0n);
    let puzzle = await peer.simulatorNewPuzzle(1n);
    let coin = await peer.simulatorNewCoin(pair.puzzleHash, 1n);

    let solution = peer.simulatorNewProgram(pair.pk);
    let coinSpends = [{ coin, puzzleReveal: puzzle.puzzleReveal, solution } as CoinSpend];

    const sig = signCoinSpends(coinSpends, [pair.sk], true);

    console.log('Signature:', sig);

    let result = await peer.broadcastSpend(coinSpends, [sig]);

    console.log('Spend result:', result);
    console.log('Peer peak:', await peer.getPeak());
  });
});

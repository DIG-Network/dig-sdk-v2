import { Layer1PeerService } from '../../../src/application/services/Layer1PeerService';
import { Peer, PeerType, Tls } from '@dignetwork/datalayer-driver';

jest.mock('@dignetwork/datalayer-driver', () => {
  const actual = jest.requireActual('@dignetwork/datalayer-driver');
  return {
    ...actual,
    Peer: {
      connectRandom: jest.fn(),
    },
  };
});

describe('Layer1PeerService', () => {
  let peerService: Layer1PeerService;
  let mockPeers: any[];
  let tls: Tls;

  beforeEach(() => {
    jest.clearAllMocks();
    peerService = Layer1PeerService.getInstance();
    // Reset singleton state
    (peerService as any).peers = [];
    (peerService as any).connected = false;
    tls = {} as Tls;
    mockPeers = [
      { getPeak: jest.fn().mockResolvedValue(10) },
      { getPeak: jest.fn().mockResolvedValue(20) },
      { getPeak: jest.fn().mockResolvedValue(20) },
      { getPeak: jest.fn().mockResolvedValue(5) },
    ];
  });

  it('connects to unique peers', async () => {
    (Peer.connectRandom as jest.Mock)
      .mockResolvedValueOnce(mockPeers[0])
      .mockResolvedValueOnce(mockPeers[1])
      .mockResolvedValueOnce(mockPeers[2]);
    await peerService.connect(3, 5, PeerType.Testnet11, tls);
    expect(peerService.getPeers().length).toBe(3);
  });

  it('throws if not enough peers can be connected', async () => {
    (Peer.connectRandom as jest.Mock).mockRejectedValue(new Error('fail'));
    await expect(peerService.connect(2, 2, PeerType.Testnet11, tls)).rejects.toThrow('Failed to connect to any peers');
  });

  it('selects peer(s) with max height and calls fn', async () => {
    (peerService as any).peers = [mockPeers[0], mockPeers[1], mockPeers[2], mockPeers[3]];
    (peerService as any).connected = true;
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await peerService.withPeer(fn);
    expect(fn).toHaveBeenCalled();
    expect(result).toBe('ok');
    // Only peers with height 20 should be tried
    expect(mockPeers[1].getPeak).toHaveBeenCalled();
    expect(mockPeers[2].getPeak).toHaveBeenCalled();
  });

  it('retries with next peer if fn fails, up to retries', async () => {
    (peerService as any).peers = [mockPeers[1], mockPeers[2]]; // both have height 20
    (peerService as any).connected = true;
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce('ok');
    const result = await peerService.withPeer(fn, 2);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(result).toBe('ok');
  });

  it('throws if all peers fail or retries exceeded', async () => {
    (peerService as any).peers = [mockPeers[1], mockPeers[2]];
    (peerService as any).connected = true;
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(peerService.withPeer(fn, 2)).rejects.toThrow('fail');
  });

  it('throws if withPeer called with no connected peers', async () => {
    (peerService as any).peers = [];
    (peerService as any).connected = false;
    const fn = jest.fn();
    await expect(peerService.withPeer(fn)).rejects.toThrow('No peers connected');
  });
});

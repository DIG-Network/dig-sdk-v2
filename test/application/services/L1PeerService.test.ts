import { L1PeerService } from '../../../src/application/services/L1PeerService';
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

describe('L1PeerService', () => {
  let mockPeers: any[];
  let tls: Tls;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton state
    (L1PeerService as any).peers = [];
    (L1PeerService as any).connected = false;
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
    await L1PeerService.connect(3, 5, PeerType.Testnet11, tls);
    expect(L1PeerService.getPeers().length).toBe(3);
  });

  it('throws if not enough peers can be connected', async () => {
    (Peer.connectRandom as jest.Mock).mockRejectedValue(new Error('fail'));
    await expect(L1PeerService.connect(2, 2, PeerType.Testnet11, tls)).rejects.toThrow('Failed to connect to any peers');
  });

  it('selects peer(s) with max height and calls fn', async () => {
    (L1PeerService as any).peers = [mockPeers[0], mockPeers[1], mockPeers[2], mockPeers[3]];
    (L1PeerService as any).connected = true;
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await L1PeerService.withPeer(fn);
    expect(fn).toHaveBeenCalled();
    expect(result).toBe('ok');
    // Only peers with height 20 should be tried
    expect(mockPeers[1].getPeak).toHaveBeenCalled();
    expect(mockPeers[2].getPeak).toHaveBeenCalled();
  });

  it('retries with next peer if fn fails, up to retries', async () => {
    (L1PeerService as any).peers = [mockPeers[1], mockPeers[2]]; // both have height 20
    (L1PeerService as any).connected = true;
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce('ok');
    const result = await L1PeerService.withPeer(fn, 2);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(result).toBe('ok');
  });

  it('throws if all peers fail or retries exceeded', async () => {
    (L1PeerService as any).peers = [mockPeers[1], mockPeers[2]];
    (L1PeerService as any).connected = true;
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(L1PeerService.withPeer(fn, 2)).rejects.toThrow('fail');
  });

  it('throws if withPeer called with no connected peers', async () => {
    (L1PeerService as any).peers = [];
    (L1PeerService as any).connected = false;
    const fn = jest.fn();
    await expect(L1PeerService.withPeer(fn)).rejects.toThrow('No peers connected');
  });

  it('removes failed peer and adds a new one on fn failure', async () => {
    (L1PeerService as any).peers = [mockPeers[1], mockPeers[2]];
    (L1PeerService as any).connected = true;
    // Simulate fn failing for the first peer, succeeding for the new peer
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce('ok');
    // Mock Peer.connectRandom to return a new peer
    (Peer.connectRandom as jest.Mock).mockResolvedValueOnce({ getPeak: jest.fn().mockResolvedValue(30) });
    const result = await L1PeerService.withPeer(fn, 2);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(result).toBe('ok');
    // The failed peer should be removed
    expect((L1PeerService as any).peers.length).toBe(2);
  });
});

import { Peer, PeerType, Tls } from '@dignetwork/datalayer-driver';

export class Layer1PeerService {
  private static peers: Peer[] = [];
  private static connected: boolean = false;
  private static peerType: PeerType = PeerType.Testnet11;
  private static tls: Tls | undefined;

  private constructor() {}

  private static async addPeer(): Promise<Peer | null> {
    try {
      const peer = await Peer.connectRandom(this.peerType, this.tls!);
      if (peer) {
        this.peers.push(peer);
        return peer;
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  public static async connect(minPeers: number = 5, retries: number = 5, peerType: PeerType = PeerType.Testnet11, tls: Tls): Promise<void> {
    if (this.connected) return;
    this.peerType = peerType;
    this.tls = tls;
    let attempts = 0;
    this.peers = [];
    while (this.peers.length < minPeers && attempts < retries) {
      await this.addPeer();
      attempts++;
    }
    this.connected = this.peers.length > 0;
    if (!this.connected) throw new Error('Failed to connect to any peers');
  }

  public static async withPeer<T>(fn: (peer: Peer) => Promise<T>, retries: number = 5): Promise<T> {
    if (!this.connected || this.peers.length === 0) throw new Error('No peers connected');
    // Get heights for all peers
    const peerHeights = await Promise.all(this.peers.map(async (peer) => {
      try {
        return await peer.getPeak() ?? 0;
      } catch {
        return 0;
      }
    }));
    // Find max height
    const maxHeight = Math.max(...peerHeights);
    // Get peers with max height
    let candidates = this.peers.filter((_, i) => peerHeights[i] === maxHeight);
    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    let lastError: unknown = null;
    let attempts = 0;
    while (candidates.length > 0 && attempts < retries) {
      const peer = candidates.shift();
      if (!peer) break;
      try {
        return await fn(peer);
      } catch (e) {
        // Remove the failed peer from the main list
        const idx = this.peers.indexOf(peer);
        if (idx !== -1) this.peers.splice(idx, 1);
        // Try to add a new peer using the helper
        await this.addPeer();
        lastError = e;
        attempts++;
      }
    }
    throw lastError || new Error('All peers failed');
  }

  public static getPeers(): Peer[] {
    return this.peers;
  }
}

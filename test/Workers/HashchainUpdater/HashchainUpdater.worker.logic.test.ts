import { api as hashchainApi } from '../../../src/Workers/HashchainUpdater/HashchainUpdater.worker.logic';

describe('HashchainUpdaterWorker.logic', () => {
  const publicKey = 'a'.repeat(64);
  const block = { hash: 'b'.repeat(64), blockHeight: 1 };

  beforeEach(() => {
    jest.clearAllMocks();
    hashchainApi.initialize(publicKey);
  });

  it('should initialize with a public key', () => {
    expect(() => hashchainApi.initialize(publicKey)).not.toThrow();
    const internals = (hashchainApi as any)._getInternals();
    expect(internals.publicKey).toBe(publicKey);
    expect(internals.hashChain).toBeNull();
  });

  it('should throw if recalculate is called before initialize', () => {
    hashchainApi.initialize('');
    expect(() => hashchainApi.recalculate(block)).toThrow('Public key is not initialized.');
  });
});

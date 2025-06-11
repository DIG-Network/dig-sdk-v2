import { api } from '../../src/Workers/BlockIndexer.worker.logic';
import fs from 'fs';

describe('BlockIndexerWorker', () => {
  const dbPath = './test_block_indexer_worker.sqlite';

  beforeEach(() => {
    api.__reset();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  afterAll(() => {
    api.__reset();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should initialize and create the database', () => {
    api.initialize(dbPath);
    expect(() => api.initialize(dbPath)).not.toThrow();
  });

  it('should ingest a hash and store it', () => {
    api.initialize(dbPath);
    const hash = api.ingest();
    expect(typeof hash).toBe('string');
    const hashes = api.getAllHashes();
    expect(hashes).toContain(hash);
  });

  it('should throw if start is called before initialize', () => {
    api.__reset();
    expect(() => api.start()).toThrow();
  });

  it('should start and stop without error after initialize', () => {
    api.initialize(dbPath);
    expect(() => api.start()).not.toThrow();
    expect(() => api.stop()).not.toThrow();
  });

  it('should notify observer when a hash is generated', done => {
    api.initialize(dbPath);
    const observable = api.onHashGenerated();
    const sub = observable.subscribe((hash: string) => {
      expect(typeof hash).toBe('string');
      sub.unsubscribe();
      done();
    });
    api.ingest();
  });
});

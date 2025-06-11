import { Block } from '../../../src/Workers/BlockIndexer/BlockIndexer.worker';
import { api } from '../../../src/Workers/BlockIndexer/BlockIndexer.worker.logic';
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
    const sub = observable.subscribe((block: Block) => {
      expect(typeof block).toBe('object');
      expect(typeof block.hash).toBe('string');
      expect(typeof block.blockHeight).toBe('number');
      sub.unsubscribe();
      done();
    });
    api.ingest();
  });

  it('should not re-initialize if already initialized', () => {
    api.initialize(dbPath);
    expect(() => api.initialize(dbPath)).not.toThrow();
  });

  it('should not start if already started', () => {
    api.initialize(dbPath);
    api.start();
    expect(() => api.start()).not.toThrow();
    api.stop();
  });

  it('should return empty array from getAllHashes if not initialized', () => {
    api.__reset();
    expect(api.getAllHashes()).toEqual([]);
  });

  it('should not throw if stop is called when not started', () => {
    api.initialize(dbPath);
    expect(() => api.stop()).not.toThrow();
  });

  it('should not notify observer if unsubscribed', done => {
    api.initialize(dbPath);
    const observable = api.onHashGenerated();
    const sub = observable.subscribe(() => {
      done.fail('Should not be called after unsubscribe');
    });
    sub.unsubscribe();
    api.ingest();
    // Wait a tick to ensure no notification
    setTimeout(() => done(), 10);
  });

  it('should not emit event if subscribe is after ingest', done => {
    api.initialize(dbPath);
    api.ingest();
    const observable = api.onHashGenerated();
    const sub = observable.subscribe(() => {
      done.fail('Should not be called');
    });
    setTimeout(() => {
      sub.unsubscribe();
      done();
    }, 10);
  });

  it('should only notify the last observer (single subscription supported)', done => {
    api.initialize(dbPath);
    const observable = api.onHashGenerated();
    let called1 = false;
    const sub1 = observable.subscribe(() => {
      called1 = true;
    });
    const sub2 = observable.subscribe(() => {
      expect(called1).toBe(false); // sub1 should not be called
      sub2.unsubscribe();
      done();
    });
    api.ingest();
  }, 1000);

  it('should not throw or notify if ingest is called before initialize', () => {
    api.__reset();
    expect(() => api.ingest()).not.toThrow();
    // Should not notify observer or insert into db
    expect(api.getAllHashes()).toEqual([]);
  });
});

import fs from 'fs';
import path from 'path';
import { FileCacheService, DIG_FOLDER_PATH } from '../../../src/application/services/FileCacheService';

describe('FileCacheService', () => {
  const testDir = path.join(DIG_FOLDER_PATH, 'jest-test-cache');
  const key = 'testKey';
  const value = { foo: 'bar', num: 42 };

  afterEach(() => {
    // Clean up test cache directory
    if (fs.existsSync(testDir)) {
      fs.readdirSync(testDir).forEach(file => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
    }
  });

  it('should save and retrieve data', () => {
    const cache = new FileCacheService('jest-test-cache');
    cache.set(key, value);
    const result = cache.get(key);
    expect(result).toEqual(value);
  });

  it('should return null for missing key', () => {
    const cache = new FileCacheService('jest-test-cache');
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should delete cached data', () => {
    const cache = new FileCacheService('jest-test-cache');
    cache.set(key, value);
    cache.delete(key);
    expect(cache.get(key)).toBeNull();
  });

  it('should list all cached keys', () => {
    const cache = new FileCacheService('jest-test-cache');
    cache.set('key1', { a: 1 });
    cache.set('key2', { b: 2 });
    const keys = cache.getCachedKeys();
    expect(keys.sort()).toEqual(['key1', 'key2'].sort());
  });

  it('should create the cache directory if it does not exist', () => {
    expect(fs.existsSync(testDir)).toBe(false);
    const cache = new FileCacheService('jest-test-cache');
    expect(fs.existsSync(testDir)).toBe(true);
  });
});

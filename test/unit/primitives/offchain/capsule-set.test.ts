import { CapsuleSet } from '../../../../src/primitives/offchain/capsule-set';
import { CapsuleSize, PaddedCapsuleSize } from '../../../../src/primitives/offchain/capsule-size';
import crypto from 'crypto';

describe('CapsuleSet', () => {
  it('should create a single capsule for data smaller than the smallest capsule size', () => {
    const buffer = crypto.randomBytes(1000);
    const set = new CapsuleSet(buffer);
    expect(set.capsules.length).toBe(1);
    expect(set.capsules[0].data.length).toBeGreaterThanOrEqual(1000);
    expect(set.metadata.checksum).toBeDefined();
  });

  it('should split data into multiple capsules at breakpoints', () => {
    const buffer = crypto.randomBytes(CapsuleSize.MB_1 + CapsuleSize.KB_256 - 1);
    const set = new CapsuleSet(buffer);
    expect(set.capsules.length).toBe(2);
    expect(set.capsules[0].size).toBe(CapsuleSize.MB_1);
    expect(set.capsules[0].data.length).toBe(PaddedCapsuleSize.MB_1);
    expect(set.capsules[1].size).toBe(CapsuleSize.KB_256);
    expect(set.capsules[1].data.length).toBe(PaddedCapsuleSize.KB_256);
  });

  it('should use largest possible capsules for large data', () => {
    const buffer = crypto.randomBytes(CapsuleSize.MB_10 * 2 + CapsuleSize.MB_1 + 1);
    const set = new CapsuleSet(buffer);

    expect(set.capsules.length).toBe(4);
    expect(set.capsules[0].size).toBe(CapsuleSize.MB_10);
    expect(set.capsules[0].data.length).toBe(PaddedCapsuleSize.MB_10);
    expect(set.capsules[1].size).toBe(CapsuleSize.MB_10);
    expect(set.capsules[1].data.length).toBe(PaddedCapsuleSize.MB_10);
    expect(set.capsules[2].size).toBe(CapsuleSize.MB_1);
    expect(set.capsules[2].data.length).toBe(PaddedCapsuleSize.MB_1);
    expect(set.capsules[3].size).toBe(CapsuleSize.KB_256);
    expect(set.capsules[3].data.length).toBe(PaddedCapsuleSize.KB_256);
  });

  it('should compute the correct id and checksum', () => {
    const buffer = crypto.randomBytes(10000);
    const set = new CapsuleSet(buffer);
    const expectedId = crypto.createHash('sha256').update(buffer).digest('hex');
    expect(set.id).toBe(expectedId);

    const concat = Buffer.concat(set.capsules.map(c => c.data));
    const expectedChecksum = crypto.createHash('sha256').update(concat).digest('hex');
    expect(set.metadata.checksum).toBe(expectedChecksum);
  });
});

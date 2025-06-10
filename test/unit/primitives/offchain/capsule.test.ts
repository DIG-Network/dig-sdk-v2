import { Capsule, CapsuleDataTooLargeError, paddingMarker } from '../../../../src/primitives/offchain/capsule';
import { CapsuleSize, getPaddedCapsuleSize, InvalidCapsuleSizeError } from '../../../../src/primitives/offchain/capsule-size';
import crypto from 'crypto';

describe('Capsule', () => {
  it('should create a Capsule with correct hash and padded data for KB_256', () => {
    const data = crypto.randomBytes(CapsuleSize.KB_256 - 456);
    const capsule = new Capsule(CapsuleSize.KB_256, data);

    expect(capsule.size).toBe(CapsuleSize.KB_256);
    expect(capsule.hash).toBe(crypto.createHash('sha256').update(data).digest('hex'));

    expect(capsule.data.length).toBe(getPaddedCapsuleSize(CapsuleSize.KB_256));

    expect(capsule.data.includes(paddingMarker)).toBe(true);

    const footer = capsule.data.subarray(capsule.data.length - 4);
    expect(footer.readUInt32LE(0)).toBe(data.length);
  });

    it('should create a Capsule with correct hash and padded data for MB_1', () => {
    const data = crypto.randomBytes(CapsuleSize.MB_1 - 456);
    const capsule = new Capsule(CapsuleSize.MB_1, data);

    expect(capsule.size).toBe(CapsuleSize.MB_1);
    expect(capsule.hash).toBe(crypto.createHash('sha256').update(data).digest('hex'));

    expect(capsule.data.length).toBe(getPaddedCapsuleSize(CapsuleSize.MB_1));

    expect(capsule.data.includes(paddingMarker)).toBe(true);

    const footer = capsule.data.subarray(capsule.data.length - 4);
    expect(footer.readUInt32LE(0)).toBe(data.length);
  });

  it('should throw CapsuleDataTooLargeError if data is larger than the capsule size', () => {
    const data = crypto.randomBytes(CapsuleSize.KB_256 + 1);
    expect(() => new Capsule(CapsuleSize.KB_256, data)).toThrow(CapsuleDataTooLargeError);
  });

  it('should allow data that exactly fits the capsule size for all valid sizes', () => {
    for (const size of Object.values(CapsuleSize)) {
      if (typeof size !== 'number') continue;
      const data = crypto.randomBytes(size);
      const capsule = new Capsule(size, data);
      expect(capsule.size).toBe(size);
      expect(capsule.data.length).toBe(getPaddedCapsuleSize(size));
    }
  });

  it('should throw if the passed size is not a valid CapsuleSize', () => {
    const invalidSize = 12345;
    const data = crypto.randomBytes(10);
    expect(() => new Capsule(invalidSize as CapsuleSize, data)).toThrow(InvalidCapsuleSizeError);
  });
});

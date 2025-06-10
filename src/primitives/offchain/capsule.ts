import { CapsuleSize, getPaddedCapsuleSize } from './capsule-size';
import crypto from 'crypto';

export interface ICapsule {
  size: CapsuleSize;
  hash: string;
  data: Buffer;
}

export const paddingMarker = Buffer.from([0xff, 0xff, 0xff, 0xff]);

export class CapsuleDataTooLargeError extends Error {
  constructor(dataLength: number, capsuleSize: number) {
    super(`Data length (${dataLength}) exceeds capsule size (${capsuleSize})`);
    this.name = 'CapsuleDataTooLargeError';
  }
}

export class Capsule implements ICapsule {
  size: CapsuleSize;
  hash: string;
  data: Buffer;

  constructor(size: CapsuleSize, data: Buffer) {
    this.size = size;
    this.hash = crypto.createHash('sha256').update(data).digest('hex');

    const paddedSize = getPaddedCapsuleSize(size);

    if (data.length > size) {
      throw new CapsuleDataTooLargeError(data.length, size);
    }

    const footer = Buffer.alloc(4);
    footer.writeUInt32LE(data.length, 0);

    const baseLength = data.length + paddingMarker.length + footer.length;
    let paddingLength = paddedSize - baseLength;

    let randomPadding = crypto.randomBytes(paddingLength);

    this.data = Buffer.concat([data, paddingMarker, randomPadding, footer], paddedSize);
  }
}

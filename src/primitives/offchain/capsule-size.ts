// 95% of the capsule size is used for data, the rest is padding and metadata.
// The bytes for lower values are aproximated to 95% beucase 95% of them are not whole numbers
export enum CapsuleSize {
    KB_256 = 249036,
    MB_1 = 996147,
    MB_10 = 9961472,
    MB_100 = 99614720,
    MB_1000 = 996147200
}

export enum PaddedCapsuleSize {
    KB_256 = 262144,
    MB_1 = 1048576,
    MB_10 = 10485760,
    MB_100 = 104857600,
    MB_1000 = 1048576000
}

export class InvalidCapsuleSizeError extends Error {
  constructor(capsuleSize: number) {
    super(`Invalid capsule size (${capsuleSize})`);
    this.name = 'InvalidCapsuleSize';
  }
}

export function getPaddedCapsuleSize(size: CapsuleSize): PaddedCapsuleSize {
    switch (size) {
        case CapsuleSize.KB_256:
            return PaddedCapsuleSize.KB_256;
        case CapsuleSize.MB_1:
            return PaddedCapsuleSize.MB_1;
        case CapsuleSize.MB_10:
            return PaddedCapsuleSize.MB_10;
        case CapsuleSize.MB_100:
            return PaddedCapsuleSize.MB_100;
        case CapsuleSize.MB_1000:
            return PaddedCapsuleSize.MB_1000;
        default:
            throw new InvalidCapsuleSizeError(size);
    }
}
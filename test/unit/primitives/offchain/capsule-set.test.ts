import { CapsuleSet } from "../../../../src/primitives/offchain/capsule-set";
import { CapsuleSize } from "../../../../src/primitives/offchain/capsule-size";
import crypto from "crypto";

describe("CapsuleSet validation", () => {
  it("should split a buffer into optimal capsules and set metadata correctly", () => {
    // 1.2 MB buffer (should split into 1x 1MB, 1x 0.2MB = 204,800 bytes)
    const buffer = crypto.randomBytes(CapsuleSize.MB_1 + 204800);
    const set = new CapsuleSet(buffer);

    // id should be sha256 of original buffer
    const expectedId = crypto.createHash("sha256").update(buffer).digest("hex");
    expect(set.id).toBe(expectedId);

    // Should have 2 capsules: 1MB and 204800 bytes (less than 256KB, so should be its own capsule)
    expect(set.capsules.length).toBe(2);
    expect(set.capsules[0].size).toBe(CapsuleSize.MB_1);
    expect(set.capsules[0].data.length).toBe(CapsuleSize.MB_1);
    expect(set.capsules[1].data.length).toBe(204800);

    // Capsule hashes should be correct
    expect(set.capsules[0].hash).toBe(
      crypto.createHash("sha256").update(set.capsules[0].data).digest("hex")
    );
    expect(set.capsules[1].hash).toBe(
      crypto.createHash("sha256").update(set.capsules[1].data).digest("hex")
    );

    // Metadata
    expect(set.metadata.originalSize).toBe(buffer.length);
    expect(set.metadata.capsuleCount).toBe(2);
    expect(set.metadata.capsuleSizes).toEqual([
      CapsuleSize.MB_1,
      204800
    ]);
    // Checksum is sha256 of concatenated capsule buffers
    const concat = Buffer.concat([set.capsules[0].data, set.capsules[1].data]);
    const expectedChecksum = crypto.createHash("sha256").update(concat).digest("hex");
    expect(set.metadata.checksum).toBe(expectedChecksum);
  });

  it("should handle a buffer smaller than the smallest capsule size", () => {
    const buffer = crypto.randomBytes(1000); // less than 256KB
    const set = new CapsuleSet(buffer);
    expect(set.capsules.length).toBe(1);
    expect(set.capsules[0].data.length).toBe(1000);
    expect(set.metadata.capsuleSizes).toEqual([1000]);
  });
});

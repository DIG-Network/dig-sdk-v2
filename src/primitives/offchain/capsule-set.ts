import { ICapsule, Capsule } from "./capsule";
import { CapsuleSize } from "./capsule-size";
import crypto from "crypto";

export interface ICapsuleSet {
    id: string;
    capsules: ICapsule[];
    metadata: {
        checksum: string;
    };
}

export class CapsuleSet implements ICapsuleSet {
    id: string;
    capsules: Capsule[];
    metadata: {
        checksum: string;
    };

    constructor(buffer: Buffer) {
        this.id = crypto.createHash("sha256").update(buffer).digest("hex");

        const { capsuleBuffers, capsules } = CapsuleSet.splitBufferIntoCapsules(buffer);

        this.capsules = capsules;

        const concatCapsules = Buffer.concat(capsuleBuffers);
        const checksum = crypto.createHash("sha256").update(concatCapsules).digest("hex");

        this.metadata = {
            checksum
        };
    }

    private static splitBufferIntoCapsules(buffer: Buffer): {
        capsuleBuffers: Buffer[];
        capsules: Capsule[];
    } {
        const validSizes = Object.values(CapsuleSize)
            .filter((v) => typeof v === "number")
            .sort((a, b) => (b as number) - (a as number)) as number[];

        let offset = 0;
        const capsuleBuffers: Buffer[] = [];
        const capsules: Capsule[] = [];

        while (offset < buffer.length) {
            let remaining = buffer.length - offset;
            
            let chosenSize = validSizes.find(sz => remaining >= sz) || validSizes[validSizes.length - 1];
            
            if (remaining < validSizes[validSizes.length - 1]) {
                chosenSize = validSizes[validSizes.length - 1];
            }
            
            let chunk: Buffer;
            if (remaining < chosenSize) {
                chunk = buffer.slice(offset, buffer.length);
            } else {
                chunk = buffer.slice(offset, offset + chosenSize);
            }
            const capsule = new Capsule(chosenSize as CapsuleSize, chunk);
            capsules.push(capsule);
            capsuleBuffers.push(capsule.data);
            offset += chunk.length;
        }
        return { capsuleBuffers, capsules };
    }
}
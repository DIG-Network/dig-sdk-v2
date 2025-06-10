import { ICapsule, Capsule } from "./capsule";
import { CapsuleSize } from "./capsule-size";
import crypto from "crypto";

export interface ICapsuleSet {
    id: string;
    capsules: ICapsule[];
    metadata: {
        originalSize: number;
        capsuleCount: number;
        capsuleSizes: number[];
        checksum: string;
    };
}

export class CapsuleSet implements ICapsuleSet {
    id: string;
    capsules: Capsule[];
    metadata: {
        originalSize: number;
        capsuleCount: number;
        capsuleSizes: number[];
        checksum: string;
    };

    constructor(buffer: Buffer) {
        this.id = crypto.createHash("sha256").update(buffer).digest("hex");

        const { capsuleSizes, capsuleBuffers, capsules } = CapsuleSet.splitBufferIntoCapsules(buffer);

        this.capsules = capsules;

        const concatCapsules = Buffer.concat(capsuleBuffers);
        const checksum = crypto.createHash("sha256").update(concatCapsules).digest("hex");

        this.metadata = {
            originalSize: buffer.length,
            capsuleCount: capsules.length,
            capsuleSizes,
            checksum
        };
    }

    private static splitBufferIntoCapsules(buffer: Buffer): {
        capsuleSizes: number[];
        capsuleBuffers: Buffer[];
        capsules: Capsule[];
    } {
        const validSizes = Object.values(CapsuleSize)
            .filter((v) => typeof v === "number")
            .sort((a, b) => (b as number) - (a as number)) as number[];

        let offset = 0;

        const capsuleSizes: number[] = [];
        const capsuleBuffers: Buffer[] = [];
        const capsules: Capsule[] = [];

        while (offset < buffer.length) {
            let chosenSize = validSizes.find(sz => sz <= buffer.length - offset) || CapsuleSize.KB_256;

            if (buffer.length - offset < CapsuleSize.KB_256) {
                chosenSize = buffer.length - offset;
            }

            const chunk = buffer.slice(offset, offset + chosenSize);
            
            capsules.push(new Capsule(chosenSize as CapsuleSize, chunk));

            capsuleSizes.push(chunk.length);
            capsuleBuffers.push(chunk);

            offset += chunk.length;
        }

        return { capsuleSizes, capsuleBuffers, capsules };
    }
}
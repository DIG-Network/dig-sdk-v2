import z from "zod";
import { BlobMetadata, BlobMetadataSchema } from "./blobMetadata";

export interface IBlob {
  id: string;
  data: Buffer;
  metadata: BlobMetadata;
}

const BlobSchema = z.object({
  id: z.string().uuid(),
  data: z.instanceof(Buffer),
  metadata: BlobMetadataSchema,
});

export class Blob implements IBlob {
  public id: string;
  public data: Buffer;
  public metadata: BlobMetadata;

  constructor(input: IBlob) {
    const parsed = BlobSchema.parse(input);
    this.id = parsed.id;
    this.data = parsed.data;
    this.metadata = parsed.metadata;
  }

  public addNumbers(a: number, b: number): number {
    return a + b;
  }
}
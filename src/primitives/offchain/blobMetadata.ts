import z from "zod";

export interface BlobMetadata {
  size: number;
  createdAt: Date;
  mimeType?: string;
  encoding?: string;
}

export const BlobMetadataSchema = z.object({
  size: z.number().int().nonnegative(),
  createdAt: z.date(),
  mimeType: z.string().optional(),
  encoding: z.string().optional(),
});
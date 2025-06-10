import { Blob } from "../../../../src/primitives/offchain/blob";
import { BlobMetadata } from "../../../../src/primitives/offchain/blobMetadata";
import { v4 as uuidv4 } from "uuid";
import { ZodError } from "zod";

const validMetadata: BlobMetadata = {
  size: 123,
  createdAt: new Date(),
  mimeType: "application/octet-stream",
  encoding: "utf-8"
};

describe("Blob validation", () => {
  it("should create a Blob with valid input", () => {
    const validBlob = new Blob({
      id: uuidv4(),
      data: Buffer.from("hello world"),
      metadata: validMetadata
    });
    expect(validBlob).toBeInstanceOf(Blob);
  });

  // it("should throw if id is not a uuid", () => {
  //   try {
  //     new Blob({
  //       id: "not-a-uuid",
  //       data: Buffer.from("test"),
  //       metadata: validMetadata
  //     });
  //   } catch (e) {
  //     expect(e).toBeInstanceOf(ZodError);
  //     expect((e as ZodError)?.issues[0].path).toContain("id");
  //     expect((e as ZodError)?.issues[0].message).toMatch(/uuid/i);
  //   }
  // });

  // it("should throw if data is not a Buffer", () => {
  //   try {
  //     new Blob({
  //       id: uuidv4(),
  //       data: "not-a-buffer" as any,
  //       metadata: validMetadata
  //     });
  //   } catch (e) {
  //     expect(e).toBeInstanceOf(ZodError);
  //     expect((e as ZodError)?.issues[0].path).toContain("data");
  //   }
  // });

  // it("should throw if size is negative", () => {
  //   try {
  //     new Blob({
  //       id: uuidv4(),
  //       data: Buffer.from("test"),
  //       metadata: { size: -1, createdAt: new Date() } as any
  //     });
  //   } catch (e) {
  //     expect(e).toBeInstanceOf(ZodError);
  //     expect((e as ZodError)?.issues[0].path).toEqual(["metadata", "size"]);
  //   }
  // });
});

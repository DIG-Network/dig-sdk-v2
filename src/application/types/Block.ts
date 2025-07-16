export class Block {
  height: number;
  headerHash: string;

  constructor(height: number, headerHash: string) {
    this.height = height;
    this.headerHash = headerHash;
  }
}

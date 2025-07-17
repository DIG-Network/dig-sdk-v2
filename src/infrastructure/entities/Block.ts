import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity()
@Index(["headerHash"])
export class Block {
  @PrimaryColumn({ type: 'integer' })
  height!: number;

  @Column({ type: 'varchar', length: 255 })
  weight!: string;

  @Column({ type: 'varchar', length: 255 })
  headerHash!: string;
}

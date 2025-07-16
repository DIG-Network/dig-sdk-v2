import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class Block {
  @PrimaryColumn({ type: 'integer' })
  height!: number;

  @Column({ type: 'text' })
  headerHash!: string;
}

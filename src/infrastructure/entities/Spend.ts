import { Entity, PrimaryColumn, Column, Index } from "typeorm";
import { getBinaryType, getCurrentDate, getDateType } from "./OrmAnnotationTypes";

@Entity({ name: 'spends' })
@Index(["spentBlock"])
export class Spend {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'coin_id' })
  coinId!: string;

  @Column({ type: getBinaryType(), name: 'puzzle_reveal', nullable: true })
  puzzleReveal?: Buffer;

  @Column({ type: getBinaryType(), name: 'solution', nullable: true })
  solution?: Buffer;

  @Column({ type: 'bigint', name: 'spent_block', nullable: true })
  spentBlock?: string;

  @Column({ type: getDateType(), default: getCurrentDate(), nullable: true })
  createdAt?: Date;
}

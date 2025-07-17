import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
@Index(["coinId"])
export class Spend {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'text', name: 'coin_id' })
  coinId!: string;

  @Column({ type: 'text', name: 'puzzle_reveal' })
  puzzleReveal!: string;

  @Column({ type: 'text', name: 'solution' })
  solution!: string;
}

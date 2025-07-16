import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class Address {
  @PrimaryColumn('text')
  address!: string;

  @Column({ type: 'text', default: "default" })
  namespace!: string;

  @Column('int')
  synced_to_height!: number;

  @Column('text')
  synced_to_hash!: string;

  @Column('text', { unique: true })
  name!: string;
}

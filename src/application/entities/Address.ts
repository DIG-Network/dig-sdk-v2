import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'addresses' })
export class Address {
  @PrimaryColumn({ type: 'text', name: 'address' })
  address!: string;

  @Column({ type: 'text', name: 'namespace', default: 'default' })
  namespace!: string;

  @Column({ type: 'bigint', name: 'synced_to_height' })
  syncedToHeight!: number;

  @Column({ type: 'text', name: 'synced_to_hash' })
  syncedToHash!: string;

  @Column({ type: 'text', name: 'name', unique: true })
  name!: string;

  @Column({ type: 'text', name: 'type', default: 'wallet' })
  type!: string;
}

import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
import {
  getBinaryType,
  getCurrentDate,
  getDateType,
} from '../../infrastructure/entities/OrmAnnotationTypes';

@Entity({ name: 'blocks' })
@Index(['headerHash'])
@Index(['timestamp'])
export class Block {
  @PrimaryColumn({ type: 'bigint' })
  height!: string;

  @Column({ type: 'bigint', nullable: false })
  weight!: string;

  @Column({ type: getBinaryType(), unique: true, nullable: false, name: 'header_hash' })
  headerHash!: Buffer;

  @Column({ type: getDateType(), default: getCurrentDate(), nullable: true })
  timestamp?: Date;
}

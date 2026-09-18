import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../common/entities/base.entity.js';

@Entity('genres')
export class Genre extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;
}

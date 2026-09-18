import { Entity, Column, OneToMany, type Relation } from 'typeorm';
import { BaseAppEntity } from '../../../common/entities/base.entity.js';
import type { Seat } from './seat.entity.js';

@Entity('halls')
export class Hall extends BaseAppEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', default: 0, name: 'total_seats' })
  totalSeats: number;

  @OneToMany('Seat', (seat: Seat) => seat.hall)
  seats: Relation<Seat>[];
}

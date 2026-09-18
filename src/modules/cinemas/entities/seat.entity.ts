import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  type Relation,
} from 'typeorm';
import { BaseAppEntity } from '../../../common/entities/base.entity.js';
import { SeatType } from '../../../common/constants/enums.js';
import type { Hall } from './hall.entity.js';

@Entity('seats')
@Unique(['hallId', 'row', 'seatNumber'])
export class Seat extends BaseAppEntity {
  @Index()
  @Column({ type: 'uuid', name: 'hall_id' })
  hallId: string;

  @ManyToOne('Hall', (hall: Hall) => hall.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hall_id' })
  hall: Relation<Hall>;

  @Column({ type: 'varchar', length: 5 })
  row: string;

  @Column({ type: 'int', name: 'seat_number' })
  seatNumber: number;

  @Column({
    type: 'enum',
    enum: SeatType,
    default: SeatType.STANDARD,
    name: 'seat_type',
  })
  seatType: SeatType;
}

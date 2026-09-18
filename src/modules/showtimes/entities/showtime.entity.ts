import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseAppEntity } from '../../../common/entities/base.entity.js';
import { Movie } from '../../movies/entities/movie.entity.js';
import { Hall } from '../../cinemas/entities/hall.entity.js';

@Entity('showtimes')
export class Showtime extends BaseAppEntity {
  @Index()
  @Column({ type: 'uuid', name: 'movie_id' })
  movieId: string;

  @ManyToOne(() => Movie, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @Index()
  @Column({ type: 'uuid', name: 'hall_id' })
  hallId: string;

  @ManyToOne(() => Hall, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hall_id' })
  hall: Hall;

  @Index()
  @Column({
    type: 'timestamp with time zone',
    name: 'start_time',
  })
  startTime: Date;

  @Index()
  @Column({
    type: 'timestamp with time zone',
    name: 'end_time',
  })
  endTime: Date;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 80000.0,
  })
  price: number;
}

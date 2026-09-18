import { Entity, Column, ManyToMany, JoinTable, Index } from 'typeorm';
import { BaseAppEntity } from '../../../common/entities/base.entity.js';
import { Genre } from './genre.entity.js';

@Entity('movies')
export class Movie extends BaseAppEntity {
  @Index()
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'poster_url' })
  posterUrl: string;

  @Column({ type: 'int', name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ type: 'date', name: 'release_date' })
  releaseDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @ManyToMany(() => Genre, { cascade: true })
  @JoinTable({
    name: 'movie_genres',
    joinColumn: { name: 'movie_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'id' },
  })
  genres: Genre[];
}

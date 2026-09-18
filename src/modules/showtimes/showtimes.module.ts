import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from './entities/showtime.entity.js';
import { MoviesModule } from '../movies/movies.module.js';
import { CinemasModule } from '../cinemas/cinemas.module.js';
import { ShowtimesService } from './showtimes.service.js';
import { ShowtimesController } from './showtimes.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Showtime]),
    MoviesModule,
    CinemasModule,
  ],
  controllers: [ShowtimesController],
  providers: [ShowtimesService],
  exports: [ShowtimesService],
})
export class ShowtimesModule {}

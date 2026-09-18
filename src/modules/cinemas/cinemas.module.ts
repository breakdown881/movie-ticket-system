import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hall } from './entities/hall.entity.js';
import { Seat } from './entities/seat.entity.js';
import { CinemasService } from './cinemas.service.js';
import { CinemasController } from './cinemas.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Hall, Seat])],
  controllers: [CinemasController],
  providers: [CinemasService],
  exports: [CinemasService],
})
export class CinemasModule {}

import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShowtimeDto {
  @ApiProperty({ example: 'movie-uuid-here', description: 'ID of the movie to schedule' })
  @IsUUID('4')
  @IsNotEmpty()
  movieId: string;

  @ApiProperty({ example: 'hall-uuid-here', description: 'ID of the auditorium hall' })
  @IsUUID('4')
  @IsNotEmpty()
  hallId: string;

  @ApiProperty({
    example: '2026-10-15T19:00:00.000Z',
    description: 'Showtime start time in ISO 8601 format',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: 95000, description: 'Base ticket price in VND' })
  @IsNumber()
  @IsPositive()
  price: number;
}

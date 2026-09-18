import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetShowtimesQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-15',
    description: 'Filter showtimes for a specific date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    example: 'movie-uuid-here',
    description: 'Filter showtimes for a specific movie',
  })
  @IsOptional()
  @IsUUID('4')
  movieId?: string;
}

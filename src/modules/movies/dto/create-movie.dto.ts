import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMovieDto {
  @ApiProperty({ example: 'Oppenheimer', description: 'Movie title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'The story of J. Robert Oppenheimer...',
    description: 'Movie description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://image.tmdb.org/t/p/original/oppenheimer.jpg',
    description: 'Poster image URL',
  })
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @ApiProperty({ example: 180, description: 'Duration in minutes' })
  @IsInt()
  @IsPositive()
  durationMinutes: number;

  @ApiProperty({ example: '2026-10-01', description: 'Release premiere date' })
  @IsDateString()
  releaseDate: string;

  @ApiProperty({ example: '2026-11-30', description: 'Theatrical end date' })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    example: ['uuid-genre-1', 'uuid-genre-2'],
    description: 'List of Genre IDs',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds: string[];
}

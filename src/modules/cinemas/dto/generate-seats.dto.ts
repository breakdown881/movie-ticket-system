import {
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSeatsDto {
  @ApiProperty({
    example: ['A', 'B', 'C', 'D', 'E'],
    description: 'List of row identifiers',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  rows: string[];

  @ApiProperty({
    example: 10,
    description: 'Number of seats per row',
  })
  @IsInt()
  @IsPositive()
  seatsPerRow: number;

  @ApiPropertyOptional({
    example: ['D', 'E'],
    description: 'Rows to be marked as VIP seats',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vipRows?: string[];

  @ApiPropertyOptional({
    example: ['E'],
    description: 'Rows to be marked as COUPLE seats',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coupleRows?: string[];
}

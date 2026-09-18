import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../../../common/constants/enums.js';

export class CreateDiscountDto {
  @ApiProperty({ example: 'CINEMA2026', description: 'Promo code string' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 20, description: 'Value (20 for 20% or 50000 for VND)' })
  @IsNumber()
  @IsPositive()
  discountValue: number;

  @ApiPropertyOptional({ example: 100000, description: 'Minimum order total required' })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 50000, description: 'Max discount amount cap' })
  @IsOptional()
  @IsNumber()
  maxDiscountAmount?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 500, description: 'Total usage quota' })
  @IsOptional()
  @IsInt()
  usageLimit?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

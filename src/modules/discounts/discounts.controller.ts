import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DiscountsService } from './discounts.service.js';
import { CreateDiscountDto } from './dto/create-discount.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../common/constants/enums.js';

@ApiTags('Discounts & Coupons')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: '[Admin] Create a new discount code' })
  createDiscount(@Body() createDiscountDto: CreateDiscountDto) {
    return this.discountsService.createDiscount(createDiscountDto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: '[Admin] Get all discount codes' })
  findAll() {
    return this.discountsService.findAll();
  }

  @Public()
  @Post('validate')
  @ApiOperation({ summary: 'Validate discount code and calculate discount amount' })
  validateDiscount(
    @Body('code') code: string,
    @Body('orderAmount') orderAmount: number,
  ) {
    return this.discountsService.validateAndCalculateDiscount(code, orderAmount);
  }
}

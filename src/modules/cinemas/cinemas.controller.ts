import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CinemasService } from './cinemas.service.js';
import { CreateHallDto } from './dto/create-hall.dto.js';
import { GenerateSeatsDto } from './dto/generate-seats.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../common/constants/enums.js';

@ApiTags('Cinemas & Halls')
@Controller('halls')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all cinema halls' })
  findAllHalls() {
    return this.cinemasService.findAllHalls();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get hall details' })
  findHallById(@Param('id', ParseUUIDPipe) id: string) {
    return this.cinemasService.findHallById(id);
  }

  @Public()
  @Get(':id/seats')
  @ApiOperation({ summary: 'Get all seats layout of a hall' })
  getSeatsByHall(@Param('id', ParseUUIDPipe) id: string) {
    return this.cinemasService.getSeatsByHall(id);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: '[Admin] Create a new cinema hall' })
  createHall(@Body() createHallDto: CreateHallDto) {
    return this.cinemasService.createHall(createHallDto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/seats/generate')
  @ApiOperation({
    summary: '[Admin] Auto-generate seat matrix for a hall (Rows, Columns, VIP seats)',
  })
  generateSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() generateSeatsDto: GenerateSeatsDto,
  ) {
    return this.cinemasService.generateSeats(id, generateSeatsDto);
  }
}

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ShowtimesService } from './showtimes.service.js';
import { CreateShowtimeDto } from './dto/create-showtime.dto.js';
import { GetShowtimesQueryDto } from './dto/get-showtimes-query.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../common/constants/enums.js';

@ApiTags('Showtimes')
@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse showtimes by date and movie' })
  findShowtimes(@Query() queryDto: GetShowtimesQueryDto) {
    return this.showtimesService.findShowtimes(queryDto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific showtime' })
  findShowtimeById(@Param('id', ParseUUIDPipe) id: string) {
    return this.showtimesService.findShowtimeById(id);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({
    summary:
      '[Admin] Schedule a movie screening with automated anti-conflict check',
  })
  createShowtime(@Body() createShowtimeDto: CreateShowtimeDto) {
    return this.showtimesService.createShowtime(createShowtimeDto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: '[Admin] Remove a showtime' })
  deleteShowtime(@Param('id', ParseUUIDPipe) id: string) {
    return this.showtimesService.deleteShowtime(id);
  }
}

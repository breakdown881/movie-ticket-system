import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { MoviesService } from './movies.service.js';
import { CreateGenreDto } from './dto/create-genre.dto.js';
import { CreateMovieDto } from './dto/create-movie.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../common/constants/enums.js';

@ApiTags('Movies & Genres')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  // ===================== GENRES =====================

  @Public()
  @Get('genres')
  @ApiOperation({ summary: 'Get all movie genres' })
  findAllGenres() {
    return this.moviesService.findAllGenres();
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('genres')
  @ApiOperation({ summary: '[Admin] Create a new movie genre' })
  createGenre(@Body() createGenreDto: CreateGenreDto) {
    return this.moviesService.createGenre(createGenreDto);
  }

  // ===================== MOVIES =====================

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse all movies' })
  findAllMovies() {
    return this.moviesService.findAllMovies();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific movie' })
  findMovieById(@Param('id', ParseUUIDPipe) id: string) {
    return this.moviesService.findMovieById(id);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: '[Admin] Add a new movie' })
  createMovie(@Body() createMovieDto: CreateMovieDto) {
    return this.moviesService.createMovie(createMovieDto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  @ApiOperation({ summary: '[Admin] Update movie details' })
  updateMovie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMovieDto: Partial<CreateMovieDto>,
  ) {
    return this.moviesService.updateMovie(id, updateMovieDto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: '[Admin] Delete a movie' })
  deleteMovie(@Param('id', ParseUUIDPipe) id: string) {
    return this.moviesService.deleteMovie(id);
  }
}

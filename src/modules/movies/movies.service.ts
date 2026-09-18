import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Movie } from './entities/movie.entity.js';
import { Genre } from './entities/genre.entity.js';
import { CreateGenreDto } from './dto/create-genre.dto.js';
import { CreateMovieDto } from './dto/create-movie.dto.js';

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  // ===================== GENRES =====================

  async createGenre(createGenreDto: CreateGenreDto): Promise<Genre> {
    const slug = createGenreDto.name.toLowerCase().trim().replace(/\s+/g, '-');
    const existing = await this.genreRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Genre '${createGenreDto.name}' already exists`);
    }

    const genre = this.genreRepository.create({
      name: createGenreDto.name,
      slug,
    });
    return this.genreRepository.save(genre);
  }

  async findAllGenres(): Promise<Genre[]> {
    return this.genreRepository.find({ order: { name: 'ASC' } });
  }

  // ===================== MOVIES =====================

  async createMovie(createMovieDto: CreateMovieDto): Promise<Movie> {
    const genres = await this.genreRepository.findBy({
      id: In(createMovieDto.genreIds),
    });

    if (genres.length !== createMovieDto.genreIds.length) {
      throw new NotFoundException('One or more genre IDs were not found');
    }

    const movie = this.movieRepository.create({
      title: createMovieDto.title,
      description: createMovieDto.description,
      posterUrl: createMovieDto.posterUrl,
      durationMinutes: createMovieDto.durationMinutes,
      releaseDate: new Date(createMovieDto.releaseDate),
      endDate: new Date(createMovieDto.endDate),
      genres,
    });

    return this.movieRepository.save(movie);
  }

  async findAllMovies(): Promise<Movie[]> {
    return this.movieRepository.find({
      relations: { genres: true },
      order: { releaseDate: 'DESC' },
    });
  }

  async findMovieById(id: string): Promise<Movie> {
    const movie = await this.movieRepository.findOne({
      where: { id },
      relations: { genres: true },
    });
    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }
    return movie;
  }

  async updateMovie(
    id: string,
    updateData: Partial<CreateMovieDto>,
  ): Promise<Movie> {
    const movie = await this.findMovieById(id);

    if (updateData.genreIds) {
      const genres = await this.genreRepository.findBy({
        id: In(updateData.genreIds),
      });
      movie.genres = genres;
    }

    if (updateData.title) movie.title = updateData.title;
    if (updateData.description !== undefined)
      movie.description = updateData.description;
    if (updateData.posterUrl !== undefined)
      movie.posterUrl = updateData.posterUrl;
    if (updateData.durationMinutes)
      movie.durationMinutes = updateData.durationMinutes;
    if (updateData.releaseDate)
      movie.releaseDate = new Date(updateData.releaseDate);
    if (updateData.endDate) movie.endDate = new Date(updateData.endDate);

    return this.movieRepository.save(movie);
  }

  async deleteMovie(id: string): Promise<{ message: string }> {
    const movie = await this.findMovieById(id);
    await this.movieRepository.remove(movie);
    return { message: `Movie '${movie.title}' deleted successfully` };
  }
}

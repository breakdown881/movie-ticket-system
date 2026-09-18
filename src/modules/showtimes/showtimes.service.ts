import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { Showtime } from './entities/showtime.entity.js';
import { MoviesService } from '../movies/movies.service.js';
import { CinemasService } from '../cinemas/cinemas.service.js';
import { CreateShowtimeDto } from './dto/create-showtime.dto.js';
import { GetShowtimesQueryDto } from './dto/get-showtimes-query.dto.js';

@Injectable()
export class ShowtimesService {
  private readonly logger = new Logger(ShowtimesService.name);

  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    private readonly moviesService: MoviesService,
    private readonly cinemasService: CinemasService,
  ) {}

  async findShowtimeById(id: string): Promise<Showtime> {
    const showtime = await this.showtimeRepository.findOne({
      where: { id },
      relations: { movie: true, hall: true },
    });
    if (!showtime) {
      throw new NotFoundException(`Showtime with ID ${id} not found`);
    }
    return showtime;
  }

  async deleteShowtime(id: string): Promise<{ message: string }> {
    const showtime = await this.findShowtimeById(id);
    await this.showtimeRepository.remove(showtime);
    return { message: 'Showtime deleted successfully' };
  }

  async createShowtime(
    createShowtimeDto: CreateShowtimeDto,
  ): Promise<Showtime> {
    const movie = await this.moviesService.findMovieById(createShowtimeDto.movieId)
    const hall = await this.cinemasService.findHallById(createShowtimeDto.hallId)

    const startTime = new Date(createShowtimeDto.startTime)
    if (startTime < new Date()) {
      throw new BadRequestException("Start time must be in future!")
    }
    const clearningBuffer = 15
    const totalDurationMs = (movie.durationMinutes + clearningBuffer) * 60 * 1000
    const endTime = new Date(startTime.getTime() + totalDurationMs)

    const conflict = await this.showtimeRepository
      .createQueryBuilder('showtime')
      .where('showtime.hallId = :hallId', { hallId: createShowtimeDto.hallId })
      .andWhere('showtime.startTime < :newEndTime', { newEndTime: endTime })
      .andWhere('showtime.endTime > :newStartTime', { newStartTime: startTime })
      .getOne()
    if (conflict) {
      throw new ConflictException("The screening room already has another screening scheduled during this time slot (including 15 minutes for cleanup)!")
    }

    const showtime = this.showtimeRepository.create({
      movieId: createShowtimeDto.movieId,
      hallId: createShowtimeDto.hallId,
      startTime,
      endTime,
      price: createShowtimeDto.price
    })

    return this.showtimeRepository.save(showtime)
  }

  async findShowtimes(queryDto: GetShowtimesQueryDto): Promise<Showtime[]> {
    const qb = this.showtimeRepository
      .createQueryBuilder('showtime')
      .leftJoinAndSelect('showtime.movie', 'movie')
      .leftJoinAndSelect('showtime.hall', 'hall')
    
    if (queryDto.movieId) {
      qb.andWhere('showtime.movieId = :movieId', {movieId: queryDto.movieId})
    }

    if (queryDto.date) {
      const startOfDay = new Date(`${queryDto.date}T00:00:00.000Z`)
      const endOfDay = new Date(`${queryDto.date}T23:59:59.999Z`)
      qb.andWhere('showtime.startTime BETWEEN :startOfDay AND :endOfDay', {startOfDay, endOfDay})
    }

    qb.orderBy('showtime.startTime', 'ASC')
    return qb.getMany()
  }
}

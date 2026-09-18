import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hall } from './entities/hall.entity.js';
import { Seat } from './entities/seat.entity.js';
import { CreateHallDto } from './dto/create-hall.dto.js';
import { GenerateSeatsDto } from './dto/generate-seats.dto.js';
import { SeatType } from '../../common/constants/enums.js';

@Injectable()
export class CinemasService {
  private readonly logger = new Logger(CinemasService.name);

  constructor(
    @InjectRepository(Hall)
    private readonly hallRepository: Repository<Hall>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
  ) {}

  async createHall(createHallDto: CreateHallDto): Promise<Hall> {
    const hall = this.hallRepository.create({
      name: createHallDto.name,
      totalSeats: 0,
    });
    return this.hallRepository.save(hall);
  }

  async findAllHalls(): Promise<Hall[]> {
    return this.hallRepository.find({ order: { name: 'ASC' } });
  }

  async findHallById(id: string): Promise<Hall> {
    const hall = await this.hallRepository.findOne({
      where: { id },
      relations: { seats: true },
    });
    if (!hall) {
      throw new NotFoundException(`Cinema hall with ID ${id} not found`);
    }
    return hall;
  }

  async getSeatsByHall(hallId: string): Promise<Seat[]> {
    await this.findHallById(hallId); // Ensure hall exists
    return this.seatRepository.find({
      where: { hallId },
      order: { row: 'ASC', seatNumber: 'ASC' },
    });
  }

  /**
   * 📝 TASK 4.1 (DÀNH CHO MENTEE): SINH SƠ ĐỒ GHẾ TỰ ĐỘNG (GENERATE SEAT MATRIX)
   *
   * Quy trình cần làm:
   * 1. Tìm Hall theo hallId (`const hall = await this.findHallById(hallId);`).
   * 2. Kiểm tra xem Hall này đã có ghế nào chưa:
   *    `const existingSeats = await this.seatRepository.count({ where: { hallId } });`
   *    Nếu > 0 -> Ném ra `new ConflictException('Phòng chiếu này đã có ghế, vui lòng không sinh đè!')`.
   * 3. Duyệt qua từng hàng trong `generateSeatsDto.rows` (ví dụ: ['A', 'B', 'C', 'D', 'E']):
   *    - Duyệt qua số ghế từ `1` đến `generateSeatsDto.seatsPerRow`:
   *      + Xác định loại ghế (`seatType`):
   *        - Nếu `generateSeatsDto.coupleRows?.includes(row)` -> `SeatType.COUPLE`
   *        - Ngược lại nếu `generateSeatsDto.vipRows?.includes(row)` -> `SeatType.VIP`
   *        - Còn lại -> `SeatType.STANDARD`
   *      + Tạo object ghế:
   *        `this.seatRepository.create({ hallId, row, seatNumber: i, seatType })`
   * 4. Lưu toàn bộ danh sách ghế vào DB: `await this.seatRepository.save(seats);`
   * 5. Cập nhật `totalSeats` cho Hall:
   *    `hall.totalSeats = seats.length; await this.hallRepository.save(hall);`
   * 6. Trả về: `{ message: 'Sinh sơ đồ ghế thành công', totalSeats: seats.length, hall }`
   */
  async generateSeats(
    hallId: string,
    generateSeatsDto: GenerateSeatsDto,
  ): Promise<{ message: string; totalSeats: number; hall: Hall }> {
    const hall = await this.findHallById(hallId)
    const existingSeats = await this.seatRepository.count({ where: { hallId } })
    if (existingSeats > 0) {
      throw new ConflictException("This hall already have had seats. Please choose another hall!")
    }
    let seats: Seat[] = []

    for (const row of generateSeatsDto.rows) {
      for (let index = 1; index <= generateSeatsDto.seatsPerRow; index++) {
        let seatType = SeatType.STANDARD
        if (generateSeatsDto.coupleRows?.includes(row)) {
          seatType = SeatType.COUPLE
        } else if (generateSeatsDto.vipRows?.includes(row)) {
          seatType = SeatType.VIP
        }

        const seat = this.seatRepository.create({ hallId, row, seatNumber: index, seatType })
        seats.push(seat)
      }
    }

    await this.seatRepository.save(seats)
    await this.hallRepository.update(hallId, { totalSeats: seats.length })
    hall.totalSeats = seats.length
    return {message: "Seat map has been created successfully!", totalSeats: seats.length, hall}
  }
}

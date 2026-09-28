import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Reservation } from "./entities/reservation.entity.js";
import { DataSource, In, Repository } from "typeorm";
import { ReservationSeat } from "./entities/reservation-seat.entity.js";
import { Showtime } from "../showtimes/entities/showtime.entity.js";
import { Seat } from "../cinemas/entities/seat.entity.js";
import { Discount } from "../discounts/entities/discount.entity.js";
import { RedisService } from "../redis/redis.service.js";
import { HOLD_DELAY_QUEUE, RabbitMQService } from "../rabbitmq/rabbitmq.service.js";
import { DiscountType, ReservationStatus, SeatType } from "../../common/constants/enums.js";
import { HoldSeatsDto } from "./dto/hold-seats.dto.js";
import { randomUUID } from "crypto";

@Injectable()
export class ReservationsService {
    private readonly logger = new Logger(ReservationsService.name)

    constructor(
        @InjectRepository(Reservation)
        private readonly reservationRepository: Repository<Reservation>,
        @InjectRepository(ReservationSeat)
        private readonly reservationSeatRepository: Repository<ReservationSeat>,
        @InjectRepository(Showtime)
        private readonly showtimeRepository: Repository<Showtime>,
        @InjectRepository(Seat)
        private readonly seatRepository: Repository<Seat>,
        @InjectRepository(Discount)
        private readonly discountRepository: Repository<Discount>,
        private readonly redisService: RedisService,
        private readonly rabbitmqService: RabbitMQService,
        private readonly dataSource: DataSource
    ) { }
    
    /**
     * 1. LẤY SƠ ĐỒ GHẾ REAL-TIME (Ghép Physical Seats + DB Confirmed + Redis Held)
     */
    async getShowtimeSeats(showtimeId: string) {
        const showtime = await this.showtimeRepository.findOne({ where: { id: showtimeId } })
        if (!showtime) {
            throw new NotFoundException('Showtime not found')
        }

        // 1. Lấy toàn bộ ghế vật lý của phòng chiếu theo thứ tự hàng và số ghế
        const allSeats = await this.seatRepository.find({
            where: { hallId: showtime.hallId },
            order: {row: 'ASC', seatNumber: 'ASC'}
        })

        // 2. Lấy danh sách ID các ghế ĐÃ BÁN (CONFIRMED) trong Database cho suất chiếu này
        const confirmedReservationSeats = await this.reservationSeatRepository
            .createQueryBuilder('rs')
            .innerJoin('rs.reservation', 'r')
            .where('r.showtimeId = :showtimeId', { showtimeId })
            .andWhere('r.status = :status', { status: ReservationStatus.CONFIRMED })
            .select('rs.seatId')
            .getMany()
        
        const confirmedSeatIds = new Set(confirmedReservationSeats.map((rs) => rs.seatId))

        // 3. Lấy danh sách ID các ghế ĐANG BỊ GIỮ (HELD) trong Redis
        const heldSeatIds = new Set(await this.redisService.getLockedSeatIds(showtimeId))

        // 4. Ghép trạng thái vào từng ghế
        return allSeats.map((seat) => {
            let status = 'AVAILABLE';
            if (confirmedSeatIds.has(seat.id)) {
                status = 'CONFIRMED'
            } else if (heldSeatIds.has(seat.id)) {
                status = 'HELD'
            }

            return {
                id: seat.id,
                row: seat.row,
                seatNumber: seat.seatNumber,
                seatType: seat.seatType,
                status
            }
        })
    }

    /**
     * 2. GIỮ GHẾ (HOLD SEATS) - 2 LAYER CONCURRENCY DEFENSE
     */
    async holdSeats(userId: string, dto: HoldSeatsDto) {
        // BƯỚC 1: Kiểm tra suất chiếu hợp lệ (tồn tại và chưa chiếu)
        const showtime = await this.showtimeRepository.findOne({ where: { id: dto.showtimeId } })
        if (!showtime) {
            throw new NotFoundException('Showtime not found')
        }

        if (new Date(showtime.startTime) <= new Date()) {
            throw new BadRequestException('Cannot book tickets for past showtimes')
        }

        // BƯỚC 2: Kiểm tra các ghế gửi lên có hợp lệ và thuộc đúng phòng chiếu không
        const seats = await this.seatRepository.find({
            where: {
                id: In(dto.seatIds),
                hallId: showtime.hallId
            }
        })

        if (seats.length !== dto.seatIds.length) {
            throw new BadRequestException('One or more selected seats are invalid for this hall')
        }

        // BƯỚC 3: Kiểm tra xem có ghế nào đã được bán (CONFIRMED) trong DB chưa
        const alreadyBookedCount = await this.reservationSeatRepository
            .createQueryBuilder('rs')
            .innerJoin('rs.reservation', 'r')
            .where('r.showtimeId = :showtimeId', { showtimeId: dto.showtimeId })
            .andWhere('r.status = :status', { status: ReservationStatus.CONFIRMED })
            .andWhere('rs.seatId IN (:...seatIds)', { seatIds: dto.seatIds })
            .getCount()
        
        if (alreadyBookedCount > 0) {
            throw new ConflictException('One or more seats have already been confirmed by someone else')
        }

        // BƯỚC 4: Tính tiền ghế và áp dụng mã giảm giá (Discount) nếu có
        let originalAmount = 0
        const seatPrices: { seatId: string; price: number }[] = []
        
        for (const seat of seats) {
            let multiplier = 1.0
            if (seat.seatType === SeatType.VIP) multiplier = 1.2
            if (seat.seatType === SeatType.COUPLE) multiplier = 1.5

            const price = Math.round(Number(showtime.price) * multiplier)
            originalAmount += price
            seatPrices.push({seatId: seat.id, price})
        }

        let discount: Discount | null = null
        let discountAmount = 0

        if (dto.discountCode) {
            discount = await this.discountRepository.findOne({ where: { code: dto.discountCode.toUpperCase(), isActive: true } })
            
            if (!discount) {
                throw new BadRequestException('Invalid discount code')
            }

            const now = new Date()
            if (now < new Date(discount.startDate) || now > new Date(discount.endDate)) {
                throw new BadRequestException('Discount code is expired or not yet valid')
            }

            if (discount.usedCount >= discount.usageLimit) {
                throw new BadRequestException('Discount code usage limit exceeded')
            }

            if (originalAmount < Number(discount.minOrderAmount)) {
                throw new BadRequestException(`Minimum order amount for this discount is ${discount.minOrderAmount}`)
            }

            if (discount.discountType === DiscountType.PERCENTAGE) {
                discountAmount = (originalAmount * Number(discount.discountValue)) / 100
                if (discount.maxDiscountAmount && discountAmount > Number(discount.maxDiscountAmount)) {
                    discountAmount = Number(discount.maxDiscountAmount)
                }
            } else {
                discountAmount = Math.min(Number(discount.discountValue), originalAmount)
            }
        }

        const finalAmount = Math.max(0, originalAmount - discountAmount)

        // BƯỚC 5: REDIS DISTRIBUTED LOCK (Lớp 1 - Chặn Race Condition)
        const reservationId = randomUUID()
        const ttlSeconds = 600 // 10 Phút

        const locked = await this.redisService.acquireMultipleSeatLocks(
            dto.showtimeId,
            dto.seatIds,
            reservationId,
            ttlSeconds
        )

        if (!locked) {
            throw new ConflictException('One or more seats are currently held by another user. Please choose different seats.')
        }

        // BƯỚC 6: DATABASE TRANSACTION (Lớp 2 - Ghi nhận giữ vé PENDING)
        try {
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

            const reservation = await this.dataSource.transaction(async (manager) => {
                const newReservation = manager.create(Reservation, {
                    id: reservationId,
                    userId,
                    showtimeId: dto.showtimeId,
                    discountId: discount ? discount.id : null,
                    originalAmount,
                    discountAmount,
                    finalAmount,
                    status: ReservationStatus.PENDING,
                    expiresAt
                })
                await manager.save(newReservation)

                const reservationSeats = seatPrices.map((sp) => manager.create(ReservationSeat, {
                    reservationId,
                    seatId: sp.seatId,
                    price: sp.price
                }))
                await manager.save(reservationSeats)

                return newReservation
            })

            // BƯỚC 7: BẮN TIN NHẮN VÀO RABBITMQ DELAY QUEUE (Chờ 10 phút tự hủy)
            await this.rabbitmqService.sendToDelayQueue(HOLD_DELAY_QUEUE, { reservationId })
            
            return {
                message: 'Seats held successfully. Please complete payment within 10 minutes.',
                reservation
            }
        } catch (err) {
            // Rollback Redis lock ngay nếu ghi DB thất bại
            this.logger.error('Failed to create reservation in DB, rolling back Redis locks', err)
            await this.redisService.releaseMultipleSeatLocks(dto.showtimeId, dto.seatIds)
            throw err
        }
    }

    /**
     * 3. HỦY GIỮ GHẾ (User chủ động ấn hủy)
     */
    async cancelReservation(userId: string, reservationId: string) {
        const reservation = await this.reservationRepository.findOne({
            where: { id: reservationId },
            relations: {reservationSeat:true, showtime: true}
        })

        if (!reservation) {
            throw new NotFoundException('Reservation not found')
        }

        if (reservation.userId !== userId) {
            throw new ForbiddenException('You cannot cancel another user\'s reservation')
        }

        if (
            reservation.status === ReservationStatus.CANCELLED ||
            reservation.status === ReservationStatus.EXPIRED
        ) {
            throw new BadRequestException('Reservation is already cancelled or expired')
        }

        // Nếu đã CONFIRMED, chỉ cho phép hủy trước giờ chiếu ít nhất 60 phút
        if (reservation.status === ReservationStatus.CONFIRMED) {
            const diffMinutes = (new Date(reservation.showtime.startTime).getTime() - Date.now()) / (1000 * 60)

            if (diffMinutes < 60) {
                throw new BadRequestException('Cannot cancel reservation less than 60 minutes before showtime')
            }
        }
        reservation.status = ReservationStatus.CANCELLED
        await this.reservationRepository.save(reservation)

        // Giải phóng Redis lock
        const seatIds = (reservation.reservationSeat || []).map((rs) => rs.seatId)
        await this.redisService.releaseMultipleSeatLocks(reservation.showtimeId, seatIds)

        return { message: 'Reservation cancelled successfully', reservationId }
    }
}
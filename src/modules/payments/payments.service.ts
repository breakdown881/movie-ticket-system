import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Payment } from "./entities/payment.entity.js";
import { DataSource, Repository } from "typeorm";
import { Reservation } from "../reservations/entities/reservation.entity.js";
import { Discount } from "../discounts/entities/discount.entity.js";
import { RedisService } from "../redis/redis.service.js";
import { CINEMA_EXCHANGE, RabbitMQService } from "../rabbitmq/rabbitmq.service.js";
import { CheckoutDto } from "./dto/checkout.dto.js";
import { ClientInfoDto } from "../../common/decorators/client-info.decorator.js";
import { PaymentStatus, ReservationStatus } from "../../common/constants/enums.js";
import { randomUUID } from "crypto";
import { map } from "rxjs";

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name)

    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        @InjectRepository(Reservation)
        private readonly reservationRepository: Repository<Reservation>,
        @InjectRepository(Discount)
        private readonly discountRepository: Repository<Discount>,
        private readonly redisService: RedisService,
        private readonly rabbitmqService: RabbitMQService,
        private readonly dataSource: DataSource
    ) { }

    /**
     * Xử lý thanh toán cho đơn giữ chỗ (Checkout)
     */
    async checkout(userId: string, dto: CheckoutDto, clientInfo: ClientInfoDto) {
        // 1. Tìm đơn giữ chỗ kèm các ghế đã chọn
        const reservation = await this.reservationRepository.findOne({
            where: { id: dto.reservationId },
            relations: {
                reservationSeat: true,
                showtime: true
            }
        })

        if (!reservation) {
            throw new NotFoundException('Reservation not found')
        }

        // 2. Bảo mật: Chỉ chủ nhân của đơn giữ chỗ mới được quyền thanh toán
        if (reservation.userId !== userId) {
            throw new ForbiddenException('You are not authorized to pay for this reservation')
        }

        // 3. Kiểm tra trạng thái đơn: Nếu đã thanh toán rồi thì không thanh toán lại
        if (reservation.status === ReservationStatus.CONFIRMED) {
            throw new BadRequestException('Reservation is already confirmed and paid')
        }

        if (reservation.status !== ReservationStatus.PENDING) {
            throw new BadRequestException(`Cannot checkout reservation with status: ${reservation.status}`)
        }

        // 4. Kiểm tra thời hạn 10 phút: Nếu quá hạn thì từ chối thanh toán
        if (new Date() > new Date(reservation.expiresAt)) {
            throw new BadRequestException('Reservation hold time has expired. Please choose seats again.')
        }

        // Giả lập mã giao dịch từ cổng thanh toán (VNPAY / Momo / Ngân hàng)
        const transactionId = `TXN_${randomUUID().substring(0, 8).toUpperCase()}`
        
        // 5. DATABASE TRANSACTION: Cập nhật Payment, Reservation và Discount
        const { payment, updatedReservation } = await this.dataSource.transaction(
            async (manager) => {
                // Tạo bản ghi Payment lưu kèm thông tin thiết bị / IP của khách
                const newPayment = manager.create(Payment, {
                    reservationId: reservation.id,
                    amount: reservation.finalAmount,
                    method: dto.method,
                    status: PaymentStatus.SUCCESS,
                    transactionId,
                    clientIp: clientInfo.ipAddress,
                    clientPlatform: clientInfo.platform,
                    clientBrowser: clientInfo.browser,
                    clientOs: clientInfo.os
                })
                await manager.save(newPayment)

                // Chuyển trạng thái đơn giữ chỗ sang CONFIRMED
                reservation.status = ReservationStatus.CONFIRMED
                const savedReservation = await manager.save(reservation)

                // Nếu có áp dụng Discount: Tăng số lượt đã sử dụng (usedCount) lên 1
                if (reservation.discountId) {
                    await manager.increment(
                        Discount,
                        { id: reservation.discountId },
                        'usedCount',
                        1
                    )
                }

                return {payment: newPayment, updatedReservation: savedReservation}
            }
        )

        // 6. DỌN DẸP REDIS LOCK: Vé đã vào DB chính thức, giải phóng RAM Redis
        const seatIds = (reservation.reservationSeat || []).map((rs) => rs.seatId)
        await this.redisService.releaseMultipleSeatLocks(reservation.showtimeId, seatIds)

        // 7. BẮN EVENT LÊN RABBITMQ (Gửi email vé xem phim)
        await this.rabbitmqService.publish(
            CINEMA_EXCHANGE,
            'email.ticket_confirmed',
            {
                userId,
                reservationId: reservation.id,
                amount: payment.amount,
                transactionId: payment.transactionId
            }
        )

        this.logger.log(`Payment successful for reservation ${reservation.id}, transaction: ${transactionId}`)

        return {
            message: 'Payment completed successfully. Your tickets are confirmed!',
            payment,
            reservation: updatedReservation
        }
    }
}
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService, RESERVATION_EXPIRED_QUEUE } from "../rabbitmq/rabbitmq.service.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Reservation } from "./entities/reservation.entity.js";
import { Repository } from "typeorm";
import { error } from "console";
import { ReservationStatus } from "../../common/constants/enums.js";
import { RedisService } from "../redis/redis.service.js";

@Injectable()
export class ReservationConsumer implements OnModuleInit {
    private readonly logger = new Logger()

    constructor(
        @InjectRepository(Reservation)
        private readonly reservationRepository: Repository<Reservation>,
        private readonly rabbitmqService: RabbitMQService,
        private readonly redisService: RedisService
    ) { }

    async onModuleInit() {
        // Đợi 1 chút để RabbitMQService hoàn tất kết nối
        setTimeout(() => this.startConsuming(), 1500);
    }

    private async startConsuming() {
        const channel = this.rabbitmqService.getChannel();
        if (!channel) {
            this.logger.warn('RabbitMQ channel not ready to consume');
            return;
        }

        channel.consume(RESERVATION_EXPIRED_QUEUE, async (msg) => {
            if (msg === null) {
                return
            }
            try {
                const {reservationId} = JSON.parse(msg.content.toString())
                const reservation = await this.reservationRepository.findOne({ where: { id: reservationId }, relations: { reservationSeat: true } })

                if (reservation && reservation?.status === ReservationStatus.PENDING) {
                    reservation.status = ReservationStatus.EXPIRED
                    await this.reservationRepository.save(reservation)
                    const seatIds = reservation.reservationSeat.map(rs => rs.seatId)
                    await this.redisService.releaseMultipleSeatLocks(reservation.showtimeId, seatIds)
                    this.logger.log("Release seat successfully!")
                }
                channel.ack(msg)
            } catch (error) {
                this.logger.error(error)
            }
        })

        
    }
}
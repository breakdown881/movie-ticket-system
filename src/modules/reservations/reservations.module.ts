import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Reservation } from "./entities/reservation.entity.js";
import { ReservationSeat } from "./entities/reservation-seat.entity.js";
import { ReservationConsumer } from "./reservation.consumer.js";
import { Showtime } from "../showtimes/entities/showtime.entity.js";
import { Seat } from "../cinemas/entities/seat.entity.js";
import { Discount } from "../discounts/entities/discount.entity.js";
import { ReservationsController } from "./reservations.controller.js";
import { ReservationsService } from "./reservations.service.js";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Reservation,
            ReservationSeat,
            Showtime,
            Seat,
            Discount
        ])
    ],
    controllers: [ReservationsController],
    providers: [ReservationConsumer, ReservationsService],
    exports: [ReservationsService]
})

export class ReservationsModule {}
import { Column, Entity, Index, JoinColumn, ManyToOne, Relation, Unique } from "typeorm";
import { BaseAppEntity } from "../../../common/entities/base.entity.js";
import { Seat } from "../../cinemas/entities/seat.entity.js";
import { Reservation } from "./reservation.entity.js";

@Entity('reservation_seats')
@Unique(['reservationId', 'seatId'])
export class ReservationSeat extends BaseAppEntity {
    @Column({ type: 'uuid', name: 'reservation_id' })
    reservationId: string;

    @Index()
    @Column({ type: 'uuid', name: 'seat_id' })
    seatId: string;

    @ManyToOne('Seat', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'seat_id' })
    seat: Seat;

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'price' })
    price: number

    @ManyToOne('Reservation', (reservation: Reservation) => reservation.reservationSeat, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reservation_id' })
    reservation: Reservation
}
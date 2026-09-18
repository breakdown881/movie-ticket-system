import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, Relation } from "typeorm";
import { BaseAppEntity } from "../../../common/entities/base.entity.js";
import { User } from "../../users/entities/user.entity.js";
import { Showtime } from "../../showtimes/entities/showtime.entity.js";
import { Discount } from "../../discounts/entities/discount.entity.js";
import { ReservationStatus } from "../../../common/constants/enums.js";
import { ReservationSeat } from "./reservation-seat.entity.js";
import { Payment } from "../../payments/entities/payment.entity.js";

@Entity('reservations')
export class Reservation extends BaseAppEntity {
    @Index()
    @Column({ type: 'uuid', name: 'user_id' })
    userId: string;

    @ManyToOne('User', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Index()
    @Column({ type: 'uuid', name: 'showtime_id' })
    showtimeId: string;

    @ManyToOne('Showtime', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'showtime_id' })
    showtime: Showtime;

    @Column({ type: 'uuid', name: 'discount_id', nullable: true })
    discountId: string | null;
    
    @ManyToOne('Discount', { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'discount_id' })
    discount: Relation<Discount> | null;

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'original_amount' })
    originalAmount: number

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'discount_amount' })
    discountAmount: number = 0

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'final_amount' })
    finalAmount: number

    @Column({
        type: 'enum',
        enum: ReservationStatus,
        default: ReservationStatus.PENDING,
        name: 'status',
    })
    status: ReservationStatus;

    @Column({ type: 'timestamp with time zone', name: 'expires_at' })
    expiresAt: Date;

    @OneToMany('ReservationSeat', (rs: ReservationSeat) => rs.reservation, { cascade: true })
    reservationSeat: Relation<ReservationSeat>[]
    @OneToOne('Payment', (p: Payment) => p.reservation)
    payment: Payment
}
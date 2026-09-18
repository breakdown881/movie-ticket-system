import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { BaseAppEntity } from "../../../common/entities/base.entity.js";
import { ClientPlatform, PaymentMethod, PaymentStatus } from "../../../common/constants/enums.js";
import { Reservation } from "../../reservations/entities/reservation.entity.js";

@Entity('payments')
export class Payment extends BaseAppEntity {
    @Column({ type: 'uuid', name: 'reservation_id', unique: true })
    reservationId: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'amount' })
    amount: number

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.BANK_TRANSFER,
        name: 'method',
    })
    method: PaymentMethod;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
        name: 'status',
    })
    status: PaymentStatus;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'transaction_id' })
    transactionId: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'client_ip' })
    clientIp: string | null;

    @Column({
        type: 'enum',
        enum: ClientPlatform,
        default: ClientPlatform.WEB,
        name: 'client_platform',
    })
    clientPlatform: ClientPlatform;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'client_browser' })
    clientBrowser: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'client_os' })
    clientOs: string | null;

    @OneToOne('Reservation', (r: Reservation) => r.payment)
    @JoinColumn({ name: 'reservation_id' })
    reservation: Reservation
}
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment } from "./entities/payment.entity.js";
import { Reservation } from "../reservations/entities/reservation.entity.js";
import { Discount } from "../discounts/entities/discount.entity.js";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";
import { VnpayGateway } from "./gateways/vnpay.gateway.js";
import { MomoGateway } from "./gateways/momo.gateway.js";
import { PaymentGatewayFactory } from "./gateways/payment-gateway.factory.js";

@Module({
    imports: [TypeOrmModule.forFeature([Payment, Reservation, Discount])],
    controllers: [PaymentsController],
    providers: [
        PaymentsService,
        VnpayGateway,
        MomoGateway,
        PaymentGatewayFactory
    ],
    exports: [PaymentsService]
})
export class PaymentsModule {}
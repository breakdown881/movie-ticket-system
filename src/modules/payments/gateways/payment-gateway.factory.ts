import { BadRequestException, Injectable } from "@nestjs/common";
import { VnpayGateway } from "./vnpay.gateway.js";
import { MomoGateway } from "./momo.gateway.js";
import { PaymentMethod } from "../../../common/constants/enums.js";
import { PaymentGateway } from "../interfaces/payment-gateway.interface.js";

@Injectable()
export class PaymentGatewayFactory {
    constructor(
        private readonly vnpayGateway: VnpayGateway,
        private readonly momoGateway: MomoGateway
    ) {}
    
    /**
     * Cấp phát Strategy tương ứng theo hình thức thanh toán
     */
    getGateway(method: PaymentMethod): PaymentGateway {
        switch (method) {
            case PaymentMethod.VNPAY:
                return this.vnpayGateway
            case PaymentMethod.MOMO:
                return this.momoGateway
            default:
                throw new BadRequestException(`The online payment gateway '${method}' is not currently supported.`)
        }
    }
}
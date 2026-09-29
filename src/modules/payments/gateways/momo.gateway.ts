import { Injectable } from "@nestjs/common";
import { CreatePaymentUrlParams, IpnVerificationResult, PaymentGateway } from "../interfaces/payment-gateway.interface.js";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomUUID } from "crypto";

@Injectable()
export class MomoGateway implements PaymentGateway {
    constructor(private readonly configService: ConfigService) { }
    
    async createPaymentUrl(params: CreatePaymentUrlParams): Promise<string> {
        const partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE', 'MOMO_CINEMA');
        const secretKey = this.configService.get<string>('MOMO_SECRET_KEY', 'MOMOSECRETKEY2026');
        const redirectUrl = this.configService.get<string>(
            'MOMO_REDIRECT_URL',
            'http://localhost:3000/api/v1/payments/momo/return',
        );
        const ipnUrl = this.configService.get<string>(
            'MOMO_IPN_URL',
            'http://localhost:3000/api/v1/payments/momo/ipn',
        );
        const requestId = randomUUID();
        const orderId = params.reservationId;
        const orderInfo = `Thanh toán vé phim đơn ${params.reservationId}`;
        const amount = Math.round(params.amount);
        const extraData = '';
        // Chuỗi ký theo định dạng MoMo quy định
        const rawSignature = `accessKey=${partnerCode}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;
        const signature = createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');
        // Link giả lập trang thanh toán MoMo Sandbox
        return `https://test-payment.momo.vn/v2/gateway/pay?partnerCode=${partnerCode}&orderId=${orderId}&amount=${amount}&signature=${signature}`;
    }

    async verifyIpn(queryOrBody: Record<string, any>): Promise<IpnVerificationResult> {
        const secretKey = this.configService.get<string>('MOMO_SECRET_KEY', 'MOMOSECRETKEY2026');
        const { partnerCode, orderId, requestId, amount, orderInfo, orderType, transId, resultCode, message, extraData, signature } = queryOrBody;
        const rawSignature = `accessKey=${partnerCode}&amount=${amount}&extraData=${extraData || ''}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&requestId=${requestId}&resultCode=${resultCode}&transId=${transId}`;
        const checkSignature = createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');
        const isValid = signature === checkSignature;
        const isSuccess = isValid && Number(resultCode) === 0;
        return {
            isValid,
            isSuccess,
            reservationId: orderId,
            transactionId: transId ? transId.toString() : `MOMO_${Date.now()}`,
            amount: Number(amount),
            message,
        };
    }
}
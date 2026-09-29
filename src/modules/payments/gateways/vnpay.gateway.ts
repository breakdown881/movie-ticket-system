import { Injectable, Logger } from "@nestjs/common";
import { CreatePaymentUrlParams, IpnVerificationResult, PaymentGateway } from "../interfaces/payment-gateway.interface.js";
import { ConfigService } from "@nestjs/config";
import { createHmac, sign } from "crypto";

@Injectable()
export class VnpayGateway implements PaymentGateway {
    private readonly logger = new Logger(VnpayGateway.name)

    constructor(private readonly configService: ConfigService) { }
    
    async createPaymentUrl(params: CreatePaymentUrlParams): Promise<string> {
        const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE', 'CINEMATMN')
        const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET', 'CINEMASECRETKEY2026')
        const vnpUrl = this.configService.get<string>('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
        const returnUrl = params.returnUrl || this.configService.get<string>('VNPAY_RETURN_URL', 'http://localhost:3000/api/v1/payments/vnpay/return')

        // Format ngày giờ theo định dạng YYYYMMDDHHmmss của VNPay
        const date = new Date()
        const createDate = date.toISOString().replace(/[-T:.Z]/g, '').substring(0, 14)

        // VNPay quy định số tiền phải nhân với 100 (đơn vị: xu)
        const vnpAmount = Math.round(params.amount * 100)

        const vnpParams: Record<string, string> = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Locale: 'vn',
            vnp_CurrCode: 'VND',
            vnp_TxnRef: params.reservationId,
            vnp_OrderInfo: `Thanh toan ve xem phim cho don ${params.reservationId}`,
            vnp_OrderType: 'other',
            vnp_Amount: vnpAmount.toString(),
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: params.clientIp || '127.0.0.1',
            vnp_CreateDate: createDate,
        }

        // Sắp xếp các tham số theo thứ tự alphabet A-Z (Quy tắc bắt buộc của VNPay)
        const sortedKeys = Object.keys(vnpParams).sort()
        const signData = sortedKeys.map((key) => `${key}=${encodeURIComponent(vnpParams[key])}`).join('&')

        // Tạo chữ ký HMAC-SHA512
        const hmac = createHmac('sha512', secretKey)
        const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

        return `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`
    }

    async verifyIpn(queryOrBody: Record<string, any>): Promise<IpnVerificationResult> {
        const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET', 'CINEMASECRETKEY2026')

        const secureHash = queryOrBody['vnp_SecureHash']
        delete queryOrBody['vnp_SecureHash']
        delete queryOrBody['vnp_secureHashType']

        // Sắp xếp lại các tham số nhận được
        const sortedKeys = Object.keys(queryOrBody).sort()
        const signData = sortedKeys.map((key) => `${key}=${encodeURIComponent(queryOrBody[key])}`).join('&')

        const hmac = createHmac('sha512', secretKey)
        const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

        const isValid = secureHash === checkHash
        const isSuccess = isValid && queryOrBody['vnp_ResponseCode'] === '00'
        const amount = Number(queryOrBody['vnp_Amount'] || 0) / 100

        return {
            isValid,
            isSuccess,
            reservationId: queryOrBody['vnp_TxnRef'],
            transactionId: queryOrBody['vnp_TransactionNo'] || `VNP_${Date.now()}`,
            amount,
            message: isSuccess ? 'Transaction successful' : 'The transaction failed or was canceled.'
        }
    }
}
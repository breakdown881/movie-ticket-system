export interface CreatePaymentUrlParams {
    reservationId: string
    amount: number
    orderInfo: string
    clientIp: string
    returnUrl?: string
}

export interface IpnVerificationResult {
    isValid: boolean // Chữ ký Checksum có hợp lệ không
    isSuccess: boolean // Giao dịch có thành công không
    reservationId: string
    transactionId: string
    amount: number
    message?: string
}

export interface PaymentGateway {
    /**
     * Tạo URL thanh toán để redirect khách hàng sang cổng
     */
    createPaymentUrl(params: CreatePaymentUrlParams): Promise<string>

    /**
     * Xác minh tính hợp lệ của Webhook IPN từ cổng gửi về
     */
    verifyIpn(queryOrBody: Record<string, any>): Promise<IpnVerificationResult>
}
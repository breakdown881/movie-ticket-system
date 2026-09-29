import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { CheckoutDto } from "./dto/checkout.dto.js";
import { ClientInfo, type ClientInfoDto } from "../../common/decorators/client-info.decorator.js";
import { CreatePaymentUrlDto } from "./dto/create-payment-url.dto.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { PaymentMethod } from "../../common/constants/enums.js";

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }
    
    @Post('checkout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Thanh toán đơn giữ vé và xác nhận vé xem phim (Yêu cầu đăng nhập)' })
    async checkout(
        @CurrentUser('id') userId: string,
        @Body() dto: CheckoutDto,
        @ClientInfo() clientInfo: ClientInfoDto
    ) {
        return this.paymentsService.checkout(userId, dto, clientInfo)
    }

    @Post('create-url')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Tạo URL thanh toán online (VNPay / MoMo) để redirect khách hàng' })
    async createPaymentUrl(
        @CurrentUser('id') userId: string,
        @Body() dto: CreatePaymentUrlDto,
        @ClientInfo() clientInfo: ClientInfoDto,
    ) {
        return this.paymentsService.createPaymentUrl(userId, dto, clientInfo);
    }

    // ===================== WEBHOOK IPN ENDPOINTS =====================

    @Public()
    @Get('vnpay/ipn')
    @ApiOperation({ summary: '[Webhook] Cổng VNPay gọi ngầm Server-to-Server để báo kết quả' })
    async vnpayIpn(@Query() query: Record<string, any>) {
        return this.paymentsService.handleIpn(PaymentMethod.VNPAY, query);
    }
    @Public()
    @Get('vnpay/return')
    @ApiOperation({ summary: '[Return URL] Trang khách hàng được VNPay chuyển hướng về sau khi thanh toán' })
    async vnpayReturn(@Query() query: Record<string, any>) {
        const isSuccess = query['vnp_ResponseCode'] === '00';
        return {
            status: isSuccess ? 'SUCCESS' : 'FAILED',
            message: isSuccess
                ? 'Giao dịch qua VNPay thành công! Vé của bạn đã được xác nhận.'
                : 'Giao dịch qua VNPay không thành công hoặc đã bị hủy.',
            reservationId: query['vnp_TxnRef'],
            transactionId: query['vnp_TransactionNo'],
            amount: Number(query['vnp_Amount'] || 0) / 100,
        };
    }
    @Public()
    @Post('momo/ipn')
    @ApiOperation({ summary: '[Webhook] Cổng MoMo gọi ngầm Server-to-Server để báo kết quả' })
    async momoIpn(@Body() body: Record<string, any>) {
        return this.paymentsService.handleIpn(PaymentMethod.MOMO, body);
    }
}
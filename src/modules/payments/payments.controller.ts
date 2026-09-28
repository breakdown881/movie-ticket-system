import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { CheckoutDto } from "./dto/checkout.dto.js";
import { ClientInfo, type ClientInfoDto } from "../../common/decorators/client-info.decorator.js";

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
}
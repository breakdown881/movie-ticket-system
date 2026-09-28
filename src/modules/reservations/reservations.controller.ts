import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ReservationsService } from "./reservations.service.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { HoldSeatsDto } from "./dto/hold-seats.dto.js";

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) { }
    
    @Get('showtimes/:showtimeId/seats')
    @ApiOperation({ summary: 'Lấy sơ đồ ghế kèm theo trạng thái real-time (AVAILABLE, HELD, CONFIRMED)' })
    async getShowtimeSeats(@Param('showtimeId', ParseUUIDPipe) showtimeId: string) {
        return this.reservationsService.getShowtimeSeats(showtimeId)
    }

    @Post('hold')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Tạm giữ ghế trong 10 phút (Yêu cầu đăng nhập)' })
    async holdSeats(
        @CurrentUser('id') userId: string,
        @Body() dto: HoldSeatsDto
    ) {
        return this.reservationsService.holdSeats(userId, dto)
    }

    @Patch(':id/cancel')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Hủy đơn giữ vé / Hủy vé đã đặt (Yêu cầu đăng nhập)' })
    async cancelReservation(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) reservationId: string
    ) {
        return this.reservationsService.cancelReservation(userId, reservationId)
    }
}
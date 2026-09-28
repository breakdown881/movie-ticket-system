import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";
import { PaymentMethod } from "../../../common/constants/enums.js";

export class CheckoutDto {
    @ApiProperty({
        description: 'ID của đơn giữ chỗ (Reservation UUID)',
        example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    })
    @IsUUID()
    @IsNotEmpty()
    reservationId: string

    @ApiProperty({
        description: 'Phương thức thanh toán',
        enum: PaymentMethod,
        example: PaymentMethod.VNPAY
    })
    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    method: PaymentMethod
}
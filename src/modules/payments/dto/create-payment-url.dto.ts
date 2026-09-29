import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";
import { PaymentMethod } from "../../../common/constants/enums.js";

export class CreatePaymentUrlDto {
    @ApiProperty({
        description: 'Reservation UUID',
        example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    })
    @IsUUID('4')
    @IsNotEmpty()
    reservationId: string

    @ApiProperty({
        description: 'Payment gateway you want to use',
        enum: PaymentMethod,
        example: PaymentMethod.VNPAY
    })
    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    method: PaymentMethod
}
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class HoldSeatsDto {
    @IsUUID()
    @IsNotEmpty()
    showtimeId: string

    @IsArray()
    @ArrayNotEmpty()
    @IsUUID('4', { each: true })
    seatIds: string[]

    @IsOptional()
    @IsString()
    discountCode: string
}
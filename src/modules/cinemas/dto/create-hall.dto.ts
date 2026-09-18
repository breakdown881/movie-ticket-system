import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHallDto {
  @ApiProperty({ example: 'Hall 01 - IMAX', description: 'Name of the cinema hall' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

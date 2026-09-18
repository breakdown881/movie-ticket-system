import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGenreDto {
  @ApiProperty({ example: 'Action', description: 'Genre name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

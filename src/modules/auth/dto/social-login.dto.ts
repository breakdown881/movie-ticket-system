import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google ID Token or Access Token returned by Google OAuth client',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Google token is required' })
  token: string;
}

export class FacebookLoginDto {
  @ApiProperty({
    description: 'Facebook User Access Token returned by Facebook SDK',
    example: 'EAABsbCS1iHgBA...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Facebook access token is required' })
  accessToken: string;
}

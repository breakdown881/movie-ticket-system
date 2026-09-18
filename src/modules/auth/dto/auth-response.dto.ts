import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/constants/enums.js';

export class UserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn...' })
  accessToken: string;

  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;
}

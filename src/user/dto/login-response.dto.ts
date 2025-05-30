import { ApiProperty } from '@nestjs/swagger';

class UserDetails {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'Email verification status' })
  isVerified: boolean;
}

class TokenDetails {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;
}

export class LoginResponseDto {
  @ApiProperty({ type: UserDetails })
  user: UserDetails;

  @ApiProperty({ type: TokenDetails })
  tokens: TokenDetails;
}

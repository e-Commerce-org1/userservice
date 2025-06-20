import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token issued during login (JWT or UUID format)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token must not be empty.' })
  @MinLength(20, { message: 'Refresh token is too short.' })
  @MaxLength(500, { message: 'Refresh token is too long.' })
  refreshToken: string;
}

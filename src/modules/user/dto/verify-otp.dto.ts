import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  @ApiProperty({ description: 'One-time password (6 digits)' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}

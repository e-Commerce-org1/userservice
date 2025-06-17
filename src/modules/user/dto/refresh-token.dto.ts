import { IsEmail, IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'RefreshToken' })
  @IsNotEmpty()
  @IsString()
  refreshToken:string;
}

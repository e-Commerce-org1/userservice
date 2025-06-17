import { IsEmail, IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'password' })
    @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'phone number' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
  phoneNumber: string;
}

import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ description: 'Full name of the user' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim().toLowerCase())
  @MaxLength(254)
  email: string;

  @ApiProperty({
    description: 'Password (min 8 characters, must include upper, lower, digit, special)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message: 'Password must include uppercase, lowercase, number, and special character.',
  })
  password: string;

  @ApiProperty({ description: 'Phone number (digits only)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{8,15}$/, {
    message: 'Phone number must be between 8 and 15 digits.',
  })
  phoneNumber: string;
}

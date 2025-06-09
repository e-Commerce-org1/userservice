import { IsEmail, IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

    @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
  phoneNumber: number;
}

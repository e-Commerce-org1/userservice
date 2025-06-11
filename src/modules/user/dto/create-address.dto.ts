import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, MinLength } from 'class-validator';

export class CreateAddressDto {

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  phoneNumber: string;
    
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsEnum(['home', 'work', 'other'], { message: 'addressType must be home, work, or other' })
  @IsOptional()
  addressType?: 'home' | 'work' | 'other';
}

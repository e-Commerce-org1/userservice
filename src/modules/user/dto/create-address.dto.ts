import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, MinLength } from 'class-validator';

export class CreateAddressDto {

  @ApiProperty({ description: 'User name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'User phone number' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  phoneNumber: string;
    
  @ApiProperty({ description: 'street' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ description: 'city' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'state' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'country' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'postal code' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ description: 'isDefault?' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({ description: 'address type' })
  @IsEnum(['home', 'work', 'other'], { message: 'addressType must be home, work, or other' })
  @IsOptional()
  addressType?: 'home' | 'work' | 'other';
}

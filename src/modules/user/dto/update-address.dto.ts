import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {

  @ApiPropertyOptional({ description: 'Name of the person associated with the address' })
  name?: string;    

  @ApiPropertyOptional({ description: 'Phone number associated with the address' })
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Street name or number' })
  street?: string;

  @ApiPropertyOptional({ description: 'City name' })
  city?: string;

  @ApiPropertyOptional({ description: 'State or province' })
  state?: string;

  @ApiPropertyOptional({ description: 'Country name' })
  country?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  postalCode?: string;
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
  
    @IsEnum(['home', 'work', 'other'], { message: 'addressType must be home, work, or other' })
    @IsOptional()
    addressType?: 'home' | 'work' | 'other';
}

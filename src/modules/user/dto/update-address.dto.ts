import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { USER_CONSTANTS } from 'src/common/constants/user.constant';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {
  @ApiPropertyOptional({ description: 'Name of the person associated with the address' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Phone number (digits only, 8–15 characters)' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{8,15}$/, {
    message: 'Phone number must contain only digits and be 8 to 15 characters long.',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Street name or number' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  street?: string;

  @ApiPropertyOptional({ description: 'City name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @ApiPropertyOptional({ description: 'State or province' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @ApiPropertyOptional({ description: 'Country name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  @ApiPropertyOptional({ description: 'Postal code (alphanumeric, 4–12 chars)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9\s\-]{4,12}$/, {
    message:
      'Postal code must be 4–12 characters and can include letters, digits, spaces, or dashes.',
  })
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Is this the default address?' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Address type: home, work, or other',
    enum: ['home', 'work', 'other'],
  })
  @IsOptional()
  @IsEnum(USER_CONSTANTS.ADDRESS_TYPE.VALUES, {
    message: 'addressType must be one of: home, work, or other',
  })
  addressType?: string;
}

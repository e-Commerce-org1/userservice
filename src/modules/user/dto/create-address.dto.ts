import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { USER_CONSTANTS } from 'src/common/constants/user.constant';

export class CreateAddressDto {
  @ApiProperty({ description: 'Full name of the recipient' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Phone number (digits only, 8–15 characters)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{8,15}$/, {
    message: 'Phone number must contain only digits and be 8 to 15 characters long.',
  })
  phoneNumber: string;

  @ApiProperty({ description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  @MaxLength(150)
  street: string;

  @ApiProperty({ description: 'City name' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  @MaxLength(50)
  city: string;

  @ApiProperty({ description: 'State name' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  @MaxLength(50)
  state: string;

  @ApiProperty({ description: 'Country name' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  @MaxLength(50)
  country: string;

  @ApiProperty({ description: 'Postal code (alphanumeric)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9\s\-]{4,12}$/, {
    message:
      'Postal code must be 4–12 characters and can include letters, digits, spaces, or dashes.',
  })
  postalCode: string;

  @ApiProperty({ description: 'Is this the default address?', required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({
    description: 'Address type: home, work, or other',
    enum: ['home', 'work', 'other'],
    required: false,
  })
  @IsEnum(USER_CONSTANTS.ADDRESS_TYPE.VALUES, {
    message: 'addressType must be one of: home, work, or other',
  })
  @IsOptional()
  addressType?: string;
}

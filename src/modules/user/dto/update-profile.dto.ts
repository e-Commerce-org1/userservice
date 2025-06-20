import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'User name (max 100 characters)', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Name is too long (max 100 characters)' })
  name?: string;

  @ApiPropertyOptional({
    description: 'User phone number (valid mobile format)',
    example: '+919876543210',
  })
  @IsOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{8,15}$/, {
    message: 'Phone number must contain only digits and be 8 to 15 characters long.',
  })
  phoneNumber?: string;
}

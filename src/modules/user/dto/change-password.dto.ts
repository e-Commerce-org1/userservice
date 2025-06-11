import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {

  @ApiProperty({ description: 'New password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;

   @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  oldPassword: string;
}

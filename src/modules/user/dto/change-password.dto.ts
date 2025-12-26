import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'New password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message: 'Password must include uppercase, lowercase, number, and special character.',
  })
  newPassword: string;

  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  // @Matches(
  //   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
  //   { message: 'Password must include uppercase, lowercase, number, and special character.' }
  // )
  oldPassword: string;
}

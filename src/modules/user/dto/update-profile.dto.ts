import { ApiProperty } from "@nestjs/swagger";
import { IsMobilePhone, IsOptional, IsString } from "class-validator";

export class UpdateProfileDto {

  @ApiProperty({ description: 'User name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'User phone number' })
  @IsOptional()
  @IsMobilePhone()
  phoneNumber?: string;
}

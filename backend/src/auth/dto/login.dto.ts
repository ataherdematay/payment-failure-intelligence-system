import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@pfis.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'pfis2026' })
  @IsString()
  @MinLength(4)
  password: string;
}

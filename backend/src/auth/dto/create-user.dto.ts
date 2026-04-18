import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import type { UserRole } from '../../users/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'analyst@pfis.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Analyst User' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'analyst', enum: ['admin', 'analyst', 'operator'] })
  @IsIn(['admin', 'analyst', 'operator'])
  role: UserRole;

  @ApiProperty({ example: 'pfisAnalyst2026' })
  @IsString()
  @MinLength(6)
  password: string;
}

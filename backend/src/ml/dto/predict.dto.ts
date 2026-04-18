import {
  IsNumber,
  IsString,
  IsIn,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PredictDto {
  @ApiProperty({ example: 250.0 }) @IsNumber() @Min(0.01) amount: number;
  @ApiProperty({ example: 'TR' }) @IsString() country: string;
  @ApiProperty({ enum: ['mobile', 'desktop', 'tablet'] })
  @IsIn(['mobile', 'desktop', 'tablet'])
  device: string;
  @ApiProperty({
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'],
  })
  @IsIn(['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'])
  paymentMethod: string;
  @ApiProperty({ example: 'stripe' }) @IsString() gateway: string;
  @ApiProperty({ example: 0 }) @IsNumber() @Min(0) @Max(5) retryCount: number;
  @ApiProperty({ example: 0.25 }) @IsNumber() @Min(0) @Max(1) riskScore: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  hourOfDay?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;
}

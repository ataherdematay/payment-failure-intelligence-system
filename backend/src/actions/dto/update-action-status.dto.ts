import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ActionStatus } from '../action-log.entity';

export class UpdateActionStatusDto {
  @ApiProperty({ enum: ActionStatus, example: ActionStatus.APPLIED })
  @IsEnum(ActionStatus)
  status: ActionStatus;

  @ApiPropertyOptional({ example: 'Gateway API timeout during apply step' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  errorMessage?: string;
}

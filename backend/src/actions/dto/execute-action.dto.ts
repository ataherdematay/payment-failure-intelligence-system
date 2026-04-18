import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ActionType } from '../action-log.entity';

export class ExecuteActionDto {
  @ApiProperty({ example: 'high-failure-rate' })
  @IsString()
  @MaxLength(120)
  insightId: string;

  @ApiProperty({ enum: ActionType, example: ActionType.ENABLE_RETRY })
  @IsEnum(ActionType)
  actionType: ActionType;

  @ApiPropertyOptional({
    example: {
      gateway: 'square',
      newWeight: 0.15,
      reason: 'failure rate exceeded threshold',
    },
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}

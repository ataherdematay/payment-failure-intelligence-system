import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MlService } from './ml.service';
import { PredictDto } from './dto/predict.dto';

@ApiTags('ml')
@Controller('ml')
export class MlController {
  constructor(private readonly service: MlService) {}

  @Post('predict')
  @ApiOperation({ summary: 'Predict failure reason for a transaction' })
  predict(@Body() dto: PredictDto) { return this.service.predict(dto); }

  @Get('metrics')
  @ApiOperation({ summary: 'Get trained model performance metrics' })
  getMetrics() { return this.service.getModelMetrics(); }

  @Get('health')
  @ApiOperation({ summary: 'Check ML service health' })
  health() { return this.service.healthCheck(); }
}

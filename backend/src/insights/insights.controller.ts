import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InsightsService } from './insights.service';

@ApiTags('insights')
@Controller('insights')
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  @Get()
  @ApiOperation({
    summary: 'Generate actionable insights from transaction data',
  })
  getInsights() {
    return this.service.generateInsights();
  }
}

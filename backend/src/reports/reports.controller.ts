import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics/pdf')
  @ApiOperation({ summary: 'Export analytics report as PDF' })
  async exportAnalyticsPdf(
    @Res() res: Response,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const safeDays = Math.min(Math.max(days, 1), 120);
    const file = await this.reportsService.generateAnalyticsPdf(safeDays);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="pfis-analytics-${new Date().toISOString().slice(0, 10)}.pdf"`,
    );
    res.setHeader('Content-Length', file.length.toString());

    return res.send(file);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('failure-by-reason')
  @ApiOperation({
    summary: 'Failure counts and avg risk score by failure reason',
  })
  getFailureByReason() {
    return this.service.getFailureByReason();
  }

  @Get('failure-by-country')
  @ApiOperation({ summary: 'Failure rate per country' })
  getFailureByCountry() {
    return this.service.getFailureByCountry();
  }

  @Get('failure-by-device')
  @ApiOperation({ summary: 'Failure rate per device type' })
  getFailureByDevice() {
    return this.service.getFailureByDevice();
  }

  @Get('failure-by-payment-method')
  @ApiOperation({ summary: 'Failure rate per payment method' })
  getFailureByPaymentMethod() {
    return this.service.getFailureByPaymentMethod();
  }

  @Get('daily-trend')
  @ApiOperation({ summary: 'Daily transaction trend' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days (default 30)',
  })
  getDailyTrend(@Query('days') days?: string) {
    return this.service.getDailyTrend(days ? parseInt(days, 10) : 30);
  }

  @Get('hourly-pattern')
  @ApiOperation({ summary: 'Hourly failure distribution (24h pattern)' })
  getHourlyPattern() {
    return this.service.getHourlyPattern();
  }

  @Get('gateway-performance')
  @ApiOperation({
    summary: 'Gateway failure rates and avg transaction amounts',
  })
  getGatewayPerformance() {
    return this.service.getGatewayPerformance();
  }

  @Get('revenue-lost')
  @ApiOperation({ summary: 'Total revenue vs lost revenue due to failures' })
  getRevenueLost() {
    return this.service.getRevenueLost();
  }
}

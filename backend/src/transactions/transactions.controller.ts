import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions with filters & pagination' })
  @ApiResponse({ status: 200, description: 'Paginated transaction list' })
  findAll(@Query() dto: QueryTransactionsDto) {
    return this.service.findAll(dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'High-level KPI summary (totals, failure rate, avg risk)' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single transaction by UUID' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}

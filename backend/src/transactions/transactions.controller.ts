import {
  Controller, Get, Post, Delete, Param, Query, ParseUUIDPipe,
  UseInterceptors, UploadedFile, UseGuards, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
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

  // ─── Admin endpoints (JWT protected) ────────────────────────────────────────

  @Post('seed')
  @ApiOperation({ summary: 'Seed database with synthetic transactions' })
  seed() {
    return this.service.seed(5000);
  }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload CSV file with real transaction data' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadCsv(@UploadedFile() file: Express.Multer.File) {
    return this.service.importCsv(file.buffer.toString('utf-8'));
  }

  @Delete('clear')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Clear all transactions (admin only)' })
  clear() {
    return this.service.clearAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single transaction by UUID' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}

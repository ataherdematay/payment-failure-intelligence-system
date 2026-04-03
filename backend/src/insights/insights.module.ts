import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}

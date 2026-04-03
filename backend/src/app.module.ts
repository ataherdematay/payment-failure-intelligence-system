import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { TransactionsModule } from './transactions/transactions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { InsightsModule } from './insights/insights.module';
import { MlModule } from './ml/ml.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({ useFactory: databaseConfig }),
    TransactionsModule,
    AnalyticsModule,
    InsightsModule,
    MlModule,
  ],
})
export class AppModule {}

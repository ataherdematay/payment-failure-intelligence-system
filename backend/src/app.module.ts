import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { TransactionsModule } from './transactions/transactions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { InsightsModule } from './insights/insights.module';
import { MlModule } from './ml/ml.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsService } from './transactions/transactions.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({ useFactory: databaseConfig }),
    AuthModule,
    TransactionsModule,
    AnalyticsModule,
    InsightsModule,
    MlModule,
  ],
})
export class AppModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly txService: TransactionsService) {}

  async onApplicationBootstrap() {
    try {
      this.logger.log('🌱 Running startup seed check...');
      const result = await this.txService.seed(5000);
      if (result.inserted > 0) {
        this.logger.log(`✅ Seeded ${result.inserted} transactions on startup.`);
      } else {
        this.logger.log('✅ Database already seeded.');
      }
    } catch (err) {
      this.logger.error('⚠️  Startup seed failed (non-fatal):', err?.message);
    }
  }
}

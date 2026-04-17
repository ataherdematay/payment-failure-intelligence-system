import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { Transaction } from './transaction.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    MulterModule.register({ dest: '/tmp/uploads' }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'pfis-super-secret-2026',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, JwtStrategy],
  exports: [TransactionsService],
})
export class TransactionsModule {}

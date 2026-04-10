import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  /** Failure rate grouped by failure_reason */
  async getFailureByReason() {
    return this.repo
      .createQueryBuilder('t')
      .select('t.failure_reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .addSelect('ROUND(AVG(t.risk_score)::numeric, 3)', 'avgRisk')
      .where('t.status = :s', { s: 'failed' })
      .andWhere('t.failure_reason IS NOT NULL')
      .groupBy('t.failure_reason')
      .orderBy('count', 'DESC')
      .getRawMany();
  }

  /** Failure rate by country */
  async getFailureByCountry() {
    return this.repo
      .createQueryBuilder('t')
      .select('t.country', 'country')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.status = \'failed\' THEN 1 ELSE 0 END)', 'failed')
      .addSelect(
        'ROUND((SUM(CASE WHEN t.status = \'failed\' THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100, 2)',
        'failureRate',
      )
      .groupBy('t.country')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /** Failure rate by device */
  async getFailureByDevice() {
    return this.repo
      .createQueryBuilder('t')
      .select('t.device', 'device')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.status = \'failed\' THEN 1 ELSE 0 END)', 'failed')
      .addSelect(
        'ROUND((SUM(CASE WHEN t.status = \'failed\' THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100, 2)',
        'failureRate',
      )
      .groupBy('t.device')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /** Failure rate by payment method */
  async getFailureByPaymentMethod() {
    return this.repo
      .createQueryBuilder('t')
      .select('t.payment_method', 'paymentMethod')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.status = \'failed\' THEN 1 ELSE 0 END)', 'failed')
      .addSelect(
        'ROUND((SUM(CASE WHEN t.status = \'failed\' THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100, 2)',
        'failureRate',
      )
      .groupBy('t.payment_method')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /** Daily transaction trend (last N days) */
  async getDailyTrend(days: number = 30) {
    return this.repo
      .createQueryBuilder('t')
      .select('DATE(t.created_at)', 'date')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.status = \'failed\' THEN 1 ELSE 0 END)', 'failed')
      .addSelect('SUM(CASE WHEN t.status = \'success\' THEN 1 ELSE 0 END)', 'success')
      .where(`t.created_at >= NOW() - make_interval(days => ${days})`)
      .groupBy('DATE(t.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  /** Hourly failure pattern */
  async getHourlyPattern() {
    return this.repo
      .createQueryBuilder('t')
      .select('EXTRACT(HOUR FROM t.created_at)::int', 'hour')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.status = \'failed\' THEN 1 ELSE 0 END)', 'failed')
      .groupBy('EXTRACT(HOUR FROM t.created_at)')
      .orderBy('hour', 'ASC')
      .getRawMany();
  }

  /** Gateway performance */
  async getGatewayPerformance() {
    return this.repo
      .createQueryBuilder('t')
      .select('t.gateway', 'gateway')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.status = \'failed\' THEN 1 ELSE 0 END)', 'failed')
      .addSelect(
        'ROUND((SUM(CASE WHEN t.status = \'failed\' THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100, 2)',
        'failureRate',
      )
      .addSelect('ROUND(AVG(t.amount)::numeric, 2)', 'avgAmount')
      .groupBy('t.gateway')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /** Revenue lost due to failures */
  async getRevenueLost() {
    const result = await this.repo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'totalRevenue')
      .addSelect('SUM(CASE WHEN t.status = \'failed\' THEN t.amount ELSE 0 END)', 'lostRevenue')
      .getRawOne();
    return {
      totalRevenue: parseFloat(result.totalRevenue || '0').toFixed(2),
      lostRevenue: parseFloat(result.lostRevenue || '0').toFixed(2),
      lostPercent: result.totalRevenue > 0
        ? ((result.lostRevenue / result.totalRevenue) * 100).toFixed(2)
        : '0',
    };
  }
}

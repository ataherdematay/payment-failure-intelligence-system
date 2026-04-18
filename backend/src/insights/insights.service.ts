import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';

export interface Insight {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  metric: string;
  recommendation: string;
}

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  async generateInsights(): Promise<Insight[]> {
    const insights: Insight[] = [];

    // 1. Overall failure rate
    const total = await this.repo.count();
    const failed = await this.repo.count({ where: { status: 'failed' } });
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    if (failureRate > 25) {
      insights.push({
        id: 'high-failure-rate',
        type: 'critical',
        category: 'Overview',
        title: 'High Overall Failure Rate',
        description: `${failureRate.toFixed(1)}% of transactions are failing — above the 15% industry benchmark.`,
        metric: `${failureRate.toFixed(1)}% failure rate`,
        recommendation:
          'Investigate top failure reasons and implement retry logic with exponential backoff.',
      });
    }

    // 2. Worst failure reason
    const byReason = await this.repo
      .createQueryBuilder('t')
      .select('t.failure_reason', 'reason')
      .addSelect('COUNT(*)', 'cnt')
      .where('t.status = :s', { s: 'failed' })
      .andWhere('t.failure_reason IS NOT NULL')
      .groupBy('t.failure_reason')
      .orderBy('cnt', 'DESC')
      .limit(1)
      .getRawOne();

    if (byReason) {
      insights.push({
        id: 'top-failure-reason',
        type: 'warning',
        category: 'Failure Analysis',
        title: `Top Failure: ${byReason.reason.replace(/_/g, ' ')}`,
        description: `"${byReason.reason}" accounts for ${byReason.cnt} failures.`,
        metric: `${byReason.cnt} failures`,
        recommendation:
          byReason.reason === 'insufficient_funds'
            ? 'Consider payment plans or retry scheduling during pay periods.'
            : byReason.reason === 'network_error'
              ? 'Implement circuit breakers and multi-gateway failover.'
              : byReason.reason === 'fraud_suspected'
                ? 'Review fraud thresholds — high false positive rate may be blocking legitimate transactions.'
                : 'Investigate root cause and implement targeted fixes.',
      });
    }

    // 3. High-risk gateway
    const gateways = await this.repo
      .createQueryBuilder('t')
      .select('t.gateway', 'gateway')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END)",
        'failedCount',
      )
      .groupBy('t.gateway')
      .getRawMany();

    const worstGateway = gateways
      .filter((g) => parseInt(g.total) > 100)
      .map((g) => ({
        ...g,
        rate: (parseInt(g.failedCount) / parseInt(g.total)) * 100,
      }))
      .sort((a, b) => b.rate - a.rate)[0];

    if (worstGateway && worstGateway.rate > 20) {
      insights.push({
        id: 'high-risk-gateway',
        type: 'warning',
        category: 'Gateway Health',
        title: `Gateway Alert: ${worstGateway.gateway}`,
        description: `${worstGateway.gateway} has a ${worstGateway.rate.toFixed(1)}% failure rate across ${worstGateway.total} transactions.`,
        metric: `${worstGateway.rate.toFixed(1)}% failure rate`,
        recommendation: `Route high-value transactions away from ${worstGateway.gateway}. Review SLA.`,
      });
    }

    // 4. Mobile vs Desktop gap
    const deviceStats = await this.repo
      .createQueryBuilder('t')
      .select('t.device', 'device')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END)",
        'failedCount',
      )
      .groupBy('t.device')
      .getRawMany();

    const mobile = deviceStats.find((d) => d.device === 'mobile');
    const desktop = deviceStats.find((d) => d.device === 'desktop');

    if (mobile && desktop) {
      const mobileRate =
        (parseInt(mobile.failedCount) / parseInt(mobile.total)) * 100;
      const desktopRate =
        (parseInt(desktop.failedCount) / parseInt(desktop.total)) * 100;
      const gap = mobileRate - desktopRate;
      if (gap > 5) {
        insights.push({
          id: 'mobile-failure-gap',
          type: 'warning',
          category: 'Device Analysis',
          title: 'Mobile Failure Rate Significantly Higher',
          description: `Mobile failure rate (${mobileRate.toFixed(1)}%) is ${gap.toFixed(1)}pp higher than desktop (${desktopRate.toFixed(1)}%).`,
          metric: `+${gap.toFixed(1)}pp vs desktop`,
          recommendation:
            'Optimize mobile payment flows and add digital wallet support.',
        });
      }
    }

    // 5. Night-time failure spike
    const hourly = await this.repo
      .createQueryBuilder('t')
      .select('EXTRACT(HOUR FROM t.created_at)::int', 'hour')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END)",
        'failedCount',
      )
      .groupBy('EXTRACT(HOUR FROM t.created_at)')
      .getRawMany();

    const nightHours = hourly.filter((h) => h.hour >= 2 && h.hour <= 5);
    const nightTotal = nightHours.reduce((s, h) => s + parseInt(h.total), 0);
    const nightFailed = nightHours.reduce(
      (s, h) => s + parseInt(h.failedCount),
      0,
    );

    if (nightTotal > 0) {
      const nightRate = (nightFailed / nightTotal) * 100;
      if (nightRate > failureRate + 10) {
        insights.push({
          id: 'night-failure-spike',
          type: 'info',
          category: 'Temporal Patterns',
          title: 'High Failure Rate During Night Hours (2–5 AM)',
          description: `Failure rate spikes to ${nightRate.toFixed(1)}% between 2–5 AM vs ${failureRate.toFixed(1)}% overall.`,
          metric: `${nightRate.toFixed(1)}% failure rate (2–5 AM)`,
          recommendation:
            'Schedule maintenance windows carefully and add night-time health monitoring.',
        });
      }
    }

    return insights;
  }
}

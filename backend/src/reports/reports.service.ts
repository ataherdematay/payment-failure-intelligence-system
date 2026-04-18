import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { AnalyticsService } from '../analytics/analytics.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async generateAnalyticsPdf(days = 30): Promise<Buffer> {
    const [summary, revenue, gatewayPerformance, failureByReason, dailyTrend] =
      await Promise.all([
        this.transactionsService.getSummary(),
        this.analyticsService.getRevenueLost(),
        this.analyticsService.getGatewayPerformance(),
        this.analyticsService.getFailureByReason(),
        this.analyticsService.getDailyTrend(days),
      ]);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    doc.fontSize(18).text('PFIS Analytics Report', { align: 'left' });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#666666')
      .text(`Generated at: ${new Date().toISOString()}`)
      .text(`Window: Last ${days} days`)
      .fillColor('#000000');

    doc.moveDown();
    doc.fontSize(13).text('Summary');
    doc.fontSize(11).text(`Total transactions: ${summary.total}`);
    doc.text(`Failed transactions: ${summary.failed}`);
    doc.text(`Success transactions: ${summary.success}`);
    doc.text(`Failure rate: ${summary.failureRate}%`);
    doc.text(`Average risk score: ${summary.avgRiskScore}`);

    doc.moveDown();
    doc.fontSize(13).text('Revenue');
    doc.fontSize(11).text(`Total revenue: $${revenue.totalRevenue}`);
    doc.text(`Lost revenue: $${revenue.lostRevenue}`);
    doc.text(`Lost percentage: ${revenue.lostPercent}%`);

    doc.moveDown();
    doc.fontSize(13).text('Top Failure Reasons');
    failureByReason.slice(0, 5).forEach((item, idx) => {
      doc
        .fontSize(11)
        .text(
          `${idx + 1}. ${String(item.reason).replace(/_/g, ' ')} — ${item.count} fails`,
        );
    });

    doc.moveDown();
    doc.fontSize(13).text('Gateway Performance (Top 5 by volume)');
    gatewayPerformance.slice(0, 5).forEach((item, idx) => {
      doc
        .fontSize(11)
        .text(
          `${idx + 1}. ${item.gateway}: ${item.failureRate}% fail rate | Avg amount $${item.avgAmount}`,
        );
    });

    doc.moveDown();
    doc.fontSize(13).text('Trend Snapshot');
    if (dailyTrend.length > 0) {
      const latest = dailyTrend[dailyTrend.length - 1];
      doc
        .fontSize(11)
        .text(`Latest day: ${latest.date}`)
        .text(`Latest total: ${latest.total}`)
        .text(`Latest failed: ${latest.failed}`)
        .text(`Latest success: ${latest.success}`);
    } else {
      doc.fontSize(11).text('No trend data found.');
    }

    doc.moveDown(2);
    doc
      .fontSize(9)
      .fillColor('#777777')
      .text('Payment Failure Intelligence System — Internal analytics export');

    doc.end();

    return done;
  }
}

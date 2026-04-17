import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction } from './transaction.entity';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  private applyFilters(
    qb: SelectQueryBuilder<Transaction>,
    dto: QueryTransactionsDto,
  ): SelectQueryBuilder<Transaction> {
    if (dto.status)        qb.andWhere('t.status = :status', { status: dto.status });
    if (dto.failureReason) qb.andWhere('t.failure_reason = :fr', { fr: dto.failureReason });
    if (dto.country)       qb.andWhere('t.country = :country', { country: dto.country });
    if (dto.device)        qb.andWhere('t.device = :device', { device: dto.device });
    if (dto.paymentMethod) qb.andWhere('t.payment_method = :pm', { pm: dto.paymentMethod });
    if (dto.gateway)       qb.andWhere('t.gateway = :gw', { gw: dto.gateway });
    if (dto.dateFrom)      qb.andWhere('t.created_at >= :from', { from: dto.dateFrom });
    if (dto.dateTo)        qb.andWhere('t.created_at <= :to', { to: dto.dateTo });
    return qb;
  }

  async findAll(dto: QueryTransactionsDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const skip  = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('t').orderBy('t.created_at', 'DESC');
    this.applyFilters(qb, dto);
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Transaction> {
    const tx = await this.repo.findOne({ where: { id } });
    if (!tx) throw new NotFoundException(`Transaction ${id} not found`);
    return tx;
  }

  async getSummary() {
    const [total, failed, success, pending] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: 'failed' } }),
      this.repo.count({ where: { status: 'success' } }),
      this.repo.count({ where: { status: 'pending' } }),
    ]);

    const avgRisk = await this.repo
      .createQueryBuilder('t')
      .select('AVG(t.risk_score)', 'avg')
      .getRawOne();

    return {
      total,
      failed,
      success,
      pending,
      failureRate: total > 0 ? ((failed / total) * 100).toFixed(2) : '0',
      avgRiskScore: parseFloat(avgRisk?.avg ?? '0').toFixed(3),
    };
  }

  // ─── Seed ─────────────────────────────────────────────────────────────────

  async seed(count = 5000): Promise<{ inserted: number }> {
    const existing = await this.repo.count();
    if (existing >= count) {
      this.logger.log(`DB already has ${existing} records — skipping seed.`);
      return { inserted: 0 };
    }

    const COUNTRIES       = ['TR', 'US', 'DE', 'GB', 'FR', 'NL', 'AE', 'SA', 'PL', 'RU'];
    const DEVICES         = ['mobile', 'desktop', 'tablet'];
    const METHODS         = ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'];
    const GATEWAYS        = ['iyzico', 'stripe', 'paytr', 'garanti', 'akbank'];
    const FAILURE_REASONS = [
      'insufficient_funds', 'network_error', 'fraud_suspected',
      'expired_card', 'invalid_credentials',
    ];
    const REASON_WEIGHTS  = [0.35, 0.25, 0.15, 0.15, 0.10];

    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const pickWeighted = (arr: string[], weights: number[]) => {
      const r = Math.random(); let cum = 0;
      for (let i = 0; i < arr.length; i++) { cum += weights[i]; if (r <= cum) return arr[i]; }
      return arr[arr.length - 1];
    };
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const now = new Date();
    const batchSize = 500;
    let totalInserted = 0;

    for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
      const rows: Partial<Transaction>[] = [];
      const batchCount = Math.min(batchSize, count - batch * batchSize);

      for (let i = 0; i < batchCount; i++) {
        const createdAt = new Date(now.getTime() - rand(0, 90 * 24 * 3600 * 1000));
        const isFailed  = Math.random() < 0.35;
        const isPending = !isFailed && Math.random() < 0.05;
        const status    = isFailed ? 'failed' : isPending ? 'pending' : 'success';
        const reason    = isFailed ? pickWeighted(FAILURE_REASONS, REASON_WEIGHTS) : null;
        const riskScore = isFailed
          ? parseFloat(rand(0.45, 0.99).toFixed(2))
          : parseFloat(rand(0.01, 0.44).toFixed(2));

        rows.push({
          id: randomUUID(),
          userId: `user_${Math.floor(rand(1, 2000))}`,
          amount: parseFloat(rand(5, 5000).toFixed(2)),
          currency: 'USD',
          country: pick(COUNTRIES),
          device: pick(DEVICES),
          paymentMethod: pick(METHODS),
          gateway: pick(GATEWAYS),
          status,
          failureReason: reason ?? undefined,
          retryCount: isFailed ? Math.floor(rand(0, 4)) : 0,
          riskScore,
          createdAt,
        });
      }

      await this.repo.createQueryBuilder().insert().into(Transaction).values(rows).orIgnore().execute();
      totalInserted += batchCount;
      this.logger.log(`Seeded batch ${batch + 1}: ${totalInserted}/${count}`);
    }

    this.logger.log(`Seed complete — ${totalInserted} transactions inserted.`);
    return { inserted: totalInserted };
  }

  // ─── CSV Import ─────────────────────────────────────────────────────────────

  async importCsv(csvContent: string): Promise<{ inserted: number; errors: string[] }> {
    const lines  = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const rows   = lines.slice(1);
    const errors: string[] = [];
    const batch: Partial<Transaction>[] = [];

    const idx = (name: string) => header.indexOf(name);

    for (let i = 0; i < rows.length; i++) {
      try {
        // Handle quoted CSV fields
        const cols = rows[i].match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g)
          ?.map(v => v.replace(/^"|"$/g, '').trim()) ?? rows[i].split(',');

        const get = (name: string) => cols[idx(name)] ?? '';

        const amount    = parseFloat(get('amount'));
        const riskScore = parseFloat(get('risk_score') || get('riskscore') || '0.3');
        const status    = get('status') || 'failed';
        const reason    = get('failure_reason') || get('failurereason') || null;

        if (isNaN(amount)) { errors.push(`Row ${i + 2}: invalid amount`); continue; }

        batch.push({
          id:            get('id') || randomUUID(),
          userId:        get('user_id') || get('userid') || `user_${i}`,
          amount,
          currency:      get('currency') || 'USD',
          country:       (get('country') || 'US').toUpperCase().slice(0, 2),
          device:        get('device') || 'desktop',
          paymentMethod: get('payment_method') || get('paymentmethod') || 'credit_card',
          gateway:       get('gateway') || 'stripe',
          status,
          failureReason: reason ?? undefined,
          retryCount:    parseInt(get('retry_count') || '0') || 0,
          riskScore:     isNaN(riskScore) ? 0.3 : Math.min(0.99, Math.max(0, riskScore)),
          createdAt:     get('created_at') ? new Date(get('created_at')) : new Date(),
        });
      } catch (e) {
        errors.push(`Row ${i + 2}: ${e.message}`);
      }
    }

    if (batch.length) {
      // Insert in chunks of 500
      for (let s = 0; s < batch.length; s += 500) {
        await this.repo.createQueryBuilder().insert().into(Transaction).values(batch.slice(s, s + 500)).orIgnore().execute();
      }
    }

    this.logger.log(`CSV import complete: ${batch.length} inserted, ${errors.length} errors.`);
    return { inserted: batch.length, errors };
  }

  // ─── Clear ──────────────────────────────────────────────────────────────────

  async clearAll(): Promise<{ deleted: number }> {
    const count = await this.repo.count();
    await this.repo.clear();
    this.logger.warn(`Cleared ${count} transactions from database.`);
    return { deleted: count };
  }
}


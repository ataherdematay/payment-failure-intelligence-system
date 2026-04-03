import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction } from './transaction.entity';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Injectable()
export class TransactionsService {
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
}

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction } from './transaction.entity';

// ── Mock factory ──────────────────────────────────────────────────────────────

const mockTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id:            'uuid-001',
  userId:        'user_001',
  amount:        249.99,
  currency:      'USD',
  country:       'TR',
  device:        'mobile',
  paymentMethod: 'credit_card',
  gateway:       'iyzico',
  status:        'failed',
  failureReason: 'insufficient_funds',
  retryCount:    1,
  riskScore:     0.72,
  createdAt:     new Date('2026-01-15T10:00:00Z'),
  ...overrides,
} as Transaction);

const makeMockQueryBuilder = (data: Transaction[], total: number) => {
  const qb: any = {
    andWhere:      jest.fn().mockReturnThis(),
    orderBy:       jest.fn().mockReturnThis(),
    skip:          jest.fn().mockReturnThis(),
    take:          jest.fn().mockReturnThis(),
    select:        jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total]),
    getRawOne:     jest.fn().mockResolvedValue({ avg: '0.500' }),
    insert:        jest.fn().mockReturnThis(),
    into:          jest.fn().mockReturnThis(),
    values:        jest.fn().mockReturnThis(),
    orIgnore:      jest.fn().mockReturnThis(),
    execute:       jest.fn().mockResolvedValue({}),
  };
  return qb;
};

const makeRepoMock = (data: Transaction[], total: number) => ({
  count:                jest.fn(),
  findOne:              jest.fn(),
  clear:                jest.fn(),
  createQueryBuilder:   jest.fn(() => makeMockQueryBuilder(data, total)),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repoMock: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repoMock = makeRepoMock([mockTx()], 1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useValue: repoMock },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  // ── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns the transaction when found', async () => {
      const tx = mockTx();
      repoMock.findOne.mockResolvedValue(tx);
      const result = await service.findOne('uuid-001');
      expect(result).toEqual(tx);
      expect(repoMock.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-001' } });
    });

    it('throws NotFoundException when not found', async () => {
      repoMock.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getSummary ───────────────────────────────────────────────────────────────

  describe('getSummary()', () => {
    it('returns correct KPI structure', async () => {
      repoMock.count
        .mockResolvedValueOnce(100)   // total
        .mockResolvedValueOnce(35)    // failed
        .mockResolvedValueOnce(60)    // success
        .mockResolvedValueOnce(5);    // pending

      const summary = await service.getSummary();

      expect(summary.total).toBe(100);
      expect(summary.failed).toBe(35);
      expect(summary.success).toBe(60);
      expect(summary.pending).toBe(5);
      expect(summary.failureRate).toBe('35.00');
      expect(parseFloat(summary.avgRiskScore)).toBeGreaterThanOrEqual(0);
    });

    it('returns failureRate of "0" when total is 0', async () => {
      repoMock.count.mockResolvedValue(0);
      const qb = makeMockQueryBuilder([], 0);
      qb.getRawOne.mockResolvedValue({ avg: null });
      repoMock.createQueryBuilder.mockReturnValue(qb);

      const summary = await service.getSummary();
      expect(summary.failureRate).toBe('0');
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns paginated data with correct meta', async () => {
      const txList = [mockTx(), mockTx({ id: 'uuid-002' })];
      repoMock.createQueryBuilder.mockReturnValue(
        makeMockQueryBuilder(txList, 50),
      );

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(50);
      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(5);
    });

    it('defaults to page=1, limit=20 when not provided', async () => {
      const qb = makeMockQueryBuilder([mockTx()], 1);
      repoMock.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({});

      expect(qb.skip).toHaveBeenCalledWith(0);   // (1-1)*20 = 0
      expect(qb.take).toHaveBeenCalledWith(20);
    });
  });

  // ── seed ─────────────────────────────────────────────────────────────────────

  describe('seed()', () => {
    it('skips seeding when DB already has enough records', async () => {
      repoMock.count.mockResolvedValue(5000);
      const result = await service.seed(5000);
      expect(result.inserted).toBe(0);
    });

    it('inserts records when DB is empty', async () => {
      repoMock.count.mockResolvedValue(0);
      const qb = makeMockQueryBuilder([], 0);
      repoMock.createQueryBuilder.mockReturnValue(qb);

      const result = await service.seed(10); // small count for test speed
      expect(result.inserted).toBe(10);
    });
  });

  // ── clearAll ─────────────────────────────────────────────────────────────────

  describe('clearAll()', () => {
    it('calls repo.clear() and returns deleted count', async () => {
      repoMock.count.mockResolvedValue(42);
      repoMock.clear.mockResolvedValue(undefined);

      const result = await service.clearAll();

      expect(repoMock.clear).toHaveBeenCalled();
      expect(result.deleted).toBe(42);
    });
  });

  // ── importCsv ────────────────────────────────────────────────────────────────

  describe('importCsv()', () => {
    const CSV_HEADER = 'amount,status,failure_reason,country,device,payment_method,gateway';
    const VALID_ROW  = '150.00,failed,insufficient_funds,TR,mobile,credit_card,iyzico';

    it('parses valid CSV and returns inserted count', async () => {
      const qb = makeMockQueryBuilder([], 0);
      repoMock.createQueryBuilder.mockReturnValue(qb);

      const result = await service.importCsv(`${CSV_HEADER}\n${VALID_ROW}`);
      expect(result.inserted).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('reports error for rows with invalid amount', async () => {
      const qb = makeMockQueryBuilder([], 0);
      repoMock.createQueryBuilder.mockReturnValue(qb);

      const badRow = 'not-a-number,failed,,TR,mobile,credit_card,iyzico';
      const result = await service.importCsv(`${CSV_HEADER}\n${badRow}`);
      expect(result.inserted).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles empty CSV (header only)', async () => {
      const qb = makeMockQueryBuilder([], 0);
      repoMock.createQueryBuilder.mockReturnValue(qb);

      const result = await service.importCsv(CSV_HEADER);
      expect(result.inserted).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});

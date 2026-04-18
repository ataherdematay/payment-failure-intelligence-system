import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { TransactionsModule } from '../src/transactions/transactions.module';
import { AuthModule } from '../src/auth/auth.module';
import { Transaction } from '../src/transactions/transaction.entity';

const request = require('supertest');

// ── Mock Repo ─────────────────────────────────────────────────────────────────

const mockTx = (id = 'uuid-001') => ({
  id,
  userId: 'user_001',
  amount: 249.99,
  currency: 'USD',
  country: 'TR',
  device: 'mobile',
  paymentMethod: 'credit_card',
  gateway: 'iyzico',
  status: 'failed',
  failureReason: 'insufficient_funds',
  retryCount: 1,
  riskScore: 0.72,
  createdAt: new Date('2026-01-15T10:00:00Z'),
});

const makeQb = (data: any[], total: number) => ({
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([data, total]),
  getRawOne: jest.fn().mockResolvedValue({ avg: '0.450' }),
  insert: jest.fn().mockReturnThis(),
  into: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  orIgnore: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({}),
});

const mockRepo = {
  count: jest.fn(),
  findOne: jest.fn(),
  clear: jest.fn().mockResolvedValue(undefined),
  createQueryBuilder: jest.fn(() => makeQb([mockTx()], 1)),
};

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('TransactionsController (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, TransactionsModule],
    })
      .overrideProvider(getRepositoryToken(Transaction))
      .useValue(mockRepo)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Get a real JWT for protected-route tests
    jwtToken = module.get<JwtService>(JwtService).sign({
      sub: 'admin',
      email: 'admin@pfis.com',
      role: 'admin',
    });
  });

  afterAll(() => app.close());

  // ── GET /transactions/summary ─────────────────────────────────────────────

  describe('GET /api/v1/transactions/summary', () => {
    beforeEach(() => {
      mockRepo.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(34)
        .mockResolvedValueOnce(61)
        .mockResolvedValueOnce(5);
    });

    it('returns 200 with correct KPI fields', () =>
      request(app.getHttpServer())
        .get('/api/v1/transactions/summary')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('failureRate');
          expect(res.body).toHaveProperty('avgRiskScore');
        }));

    it('is publicly accessible (no auth required)', () =>
      request(app.getHttpServer())
        .get('/api/v1/transactions/summary')
        .expect(200));
  });

  // ── GET /transactions ─────────────────────────────────────────────────────

  describe('GET /api/v1/transactions', () => {
    it('returns 200 with data and meta', async () => {
      mockRepo.createQueryBuilder.mockReturnValue(makeQb([mockTx()], 10));

      return request(app.getHttpServer())
        .get('/api/v1/transactions')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('page');
        });
    });

    it('accepts pagination query params', () =>
      request(app.getHttpServer())
        .get('/api/v1/transactions?page=2&limit=5')
        .expect(200));
  });

  // ── GET /transactions/:id ─────────────────────────────────────────────────

  describe('GET /api/v1/transactions/:id', () => {
    it('returns transaction for valid UUID', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRepo.findOne.mockResolvedValue(mockTx(validUuid));

      return request(app.getHttpServer())
        .get(`/api/v1/transactions/${validUuid}`)
        .expect(200)
        .expect((res) => expect(res.body.id).toBe(validUuid));
    });

    it('returns 404 for non-existent transaction', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/api/v1/transactions/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // ── DELETE /transactions/clear ────────────────────────────────────────────

  describe('DELETE /api/v1/transactions/clear', () => {
    it('returns 401 without JWT', () =>
      request(app.getHttpServer())
        .delete('/api/v1/transactions/clear')
        .expect(401));

    it('returns 200 with valid JWT', async () => {
      mockRepo.count.mockResolvedValue(5000);

      return request(app.getHttpServer())
        .delete('/api/v1/transactions/clear')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => expect(res.body).toHaveProperty('deleted'));
    });
  });

  // ── POST /transactions/upload ─────────────────────────────────────────────

  describe('POST /api/v1/transactions/upload', () => {
    it('returns 401 without JWT', () =>
      request(app.getHttpServer())
        .post('/api/v1/transactions/upload')
        .expect(401));

    it('accepts CSV upload when authenticated (2xx response)', async () => {
      mockRepo.createQueryBuilder.mockReturnValue(makeQb([], 0));

      const csv = 'amount,status\n150.00,failed\n200.00,success\n';

      const res = await request(app.getHttpServer())
        .post('/api/v1/transactions/upload')
        .set('Authorization', `Bearer ${jwtToken}`)
        .attach('file', Buffer.from(csv), {
          filename: 'data.csv',
          contentType: 'text/csv',
        });

      // Accept 200/201 — multer dest may differ in test env
      expect([200, 201]).toContain(res.status);
    });
  });
});

// ── Auth e2e ──────────────────────────────────────────────────────────────────

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(() => app.close());

  describe('POST /api/v1/auth/login', () => {
    it('returns 201 and access_token for valid credentials', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@pfis.com', password: 'pfis2026' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.role).toBe('admin');
        }));

    it('returns 401 for wrong password', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@pfis.com', password: 'wrong' })
        .expect(401));

    it('returns 401 for wrong email', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'hacker@evil.com', password: 'pfis2026' })
        .expect(401));

    it('returns 400 for missing body fields', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400));
  });
});

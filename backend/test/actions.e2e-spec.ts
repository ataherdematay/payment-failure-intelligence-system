import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ActionLog,
  ActionStatus,
  ActionType,
} from '../src/actions/action-log.entity';
import { ActionsModule } from '../src/actions/actions.module';
import { AuthModule } from '../src/auth/auth.module';

const request = require('supertest');

const baseAction = (
  id = '11111111-1111-1111-1111-111111111111',
): ActionLog => ({
  id,
  insightId: 'high-failure-rate',
  actionType: ActionType.ENABLE_RETRY,
  parameters: { retryRate: 0.55 },
  actorEmail: 'admin@pfis.com',
  actorRole: 'admin',
  status: ActionStatus.APPLIED,
  errorMessage: undefined,
  appliedAt: new Date('2026-04-18T12:00:00.000Z'),
  createdAt: new Date('2026-04-18T12:00:00.000Z'),
  updatedAt: new Date('2026-04-18T12:00:00.000Z'),
});

const mockActionRepo = {
  create: jest.fn((payload: Partial<ActionLog>) => ({
    ...baseAction(),
    ...payload,
  })),
  save: jest.fn(async (entity: ActionLog) => entity),
  findAndCount: jest.fn(async () => [[baseAction()], 1]),
  findOne: jest.fn(async () => baseAction()),
};

describe('ActionsController (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, ActionsModule],
    })
      .overrideProvider(getRepositoryToken(ActionLog))
      .useValue(mockActionRepo)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtToken = module.get<JwtService>(JwtService).sign({
      sub: 'admin',
      email: 'admin@pfis.com',
      role: 'admin',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockActionRepo.create.mockImplementation((payload: Partial<ActionLog>) => ({
      ...baseAction(),
      ...payload,
    }));
    mockActionRepo.save.mockImplementation(async (entity: ActionLog) => entity);
    mockActionRepo.findAndCount.mockResolvedValue([[baseAction()], 1]);
    mockActionRepo.findOne.mockResolvedValue(baseAction());
  });

  it('POST /api/v1/actions/execute returns 401 without JWT', () =>
    request(app.getHttpServer())
      .post('/api/v1/actions/execute')
      .send({
        insightId: 'high-failure-rate',
        actionType: ActionType.ENABLE_RETRY,
      })
      .expect(401));

  it('POST /api/v1/actions/execute returns 201 with JWT', () =>
    request(app.getHttpServer())
      .post('/api/v1/actions/execute')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        insightId: 'high-failure-rate',
        actionType: ActionType.ENABLE_RETRY,
        parameters: { retryRate: 0.55 },
      })
      .expect(201)
      .expect((res: { body: ActionLog }) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.insightId).toBe('high-failure-rate');
      }));

  it('GET /api/v1/actions/history returns paginated data with JWT', () =>
    request(app.getHttpServer())
      .get('/api/v1/actions/history?page=1&limit=20')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .expect(
        (res: { body: { data: ActionLog[]; meta: { total: number } } }) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta.total).toBeGreaterThanOrEqual(0);
        },
      ));

  it('PATCH /api/v1/actions/:id/status updates action with JWT', () => {
    const actionId = '11111111-1111-1111-1111-111111111111';

    mockActionRepo.findOne.mockResolvedValue(baseAction(actionId));
    mockActionRepo.save.mockImplementation(async (entity: ActionLog) => ({
      ...entity,
      id: actionId,
      status: ActionStatus.FAILED,
      errorMessage: 'gateway timeout',
    }));

    return request(app.getHttpServer())
      .patch(`/api/v1/actions/${actionId}/status`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: ActionStatus.FAILED,
        errorMessage: 'gateway timeout',
      })
      .expect(200)
      .expect((res: { body: ActionLog }) => {
        expect(res.body.status).toBe(ActionStatus.FAILED);
        expect(res.body.errorMessage).toBe('gateway timeout');
      });
  });
});

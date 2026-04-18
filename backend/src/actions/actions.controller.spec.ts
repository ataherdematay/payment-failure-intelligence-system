import { Test, TestingModule } from '@nestjs/testing';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';
import { ActionLog, ActionStatus, ActionType } from './action-log.entity';

const mockActionLog = (overrides: Partial<ActionLog> = {}): ActionLog => ({
  id: 'f1ccf7d0-9749-4d96-aa43-4e3d87431c70',
  insightId: 'high-failure-rate',
  actionType: ActionType.ENABLE_RETRY,
  parameters: { retryRate: 0.5 },
  actorEmail: 'admin@pfis.com',
  actorRole: 'admin',
  status: ActionStatus.APPLIED,
  errorMessage: undefined,
  appliedAt: new Date('2026-04-18T12:00:00.000Z'),
  createdAt: new Date('2026-04-18T12:00:00.000Z'),
  updatedAt: new Date('2026-04-18T12:00:00.000Z'),
  ...overrides,
});

describe('ActionsController', () => {
  let controller: ActionsController;
  let service: jest.Mocked<ActionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionsController],
      providers: [
        {
          provide: ActionsService,
          useValue: {
            executeAction: jest.fn(),
            getHistory: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ActionsController>(ActionsController);
    service = module.get(ActionsService);
  });

  it('forwards execute request with actor from jwt payload', async () => {
    const savedAction = mockActionLog({ id: 'action-1' });
    service.executeAction.mockResolvedValue(savedAction);

    const dto = {
      insightId: 'high-failure-rate',
      actionType: ActionType.ENABLE_RETRY,
      parameters: { retryRate: 0.5 },
    };

    const req = { user: { email: 'admin@pfis.com', role: 'admin' } };
    const result = await controller.execute(dto, req);

    expect(service.executeAction.mock.calls[0]).toEqual([
      dto,
      { email: 'admin@pfis.com', role: 'admin' },
    ]);
    expect(result).toEqual(savedAction);
  });

  it('forwards history query params', async () => {
    service.getHistory.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    await controller.history(1, 20);
    expect(service.getHistory.mock.calls[0]).toEqual([1, 20]);
  });

  it('forwards status updates', async () => {
    service.updateStatus.mockResolvedValue(mockActionLog({ id: 'action-1' }));

    await controller.updateStatus('11111111-1111-1111-1111-111111111111', {
      status: ActionStatus.FAILED,
      errorMessage: 'timeout',
    });

    expect(service.updateStatus.mock.calls[0]).toEqual([
      '11111111-1111-1111-1111-111111111111',
      { status: ActionStatus.FAILED, errorMessage: 'timeout' },
    ]);
  });
});

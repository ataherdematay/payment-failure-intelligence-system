import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ActionsService } from './actions.service';
import { ActionLog, ActionStatus, ActionType } from './action-log.entity';

const mockAction = (overrides: Partial<ActionLog> = {}): ActionLog => ({
  id: '3d8cc221-95ff-47cf-91ad-f53ef6cf50aa',
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
  ...overrides,
});

const makeRepoMock = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(),
});

describe('ActionsService', () => {
  let service: ActionsService;
  let repoMock: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repoMock = makeRepoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionsService,
        { provide: getRepositoryToken(ActionLog), useValue: repoMock },
      ],
    }).compile();

    service = module.get<ActionsService>(ActionsService);
  });

  describe('executeAction()', () => {
    it('creates and saves action log with actor details', async () => {
      const dto = {
        insightId: 'high-failure-rate',
        actionType: ActionType.ENABLE_RETRY,
        parameters: { retryRate: 0.55 },
      };

      const created = mockAction();
      repoMock.create.mockReturnValue(created);
      repoMock.save.mockResolvedValue(created);

      const result = await service.executeAction(dto, {
        email: 'admin@pfis.com',
        role: 'admin',
      });

      expect(repoMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          insightId: dto.insightId,
          actionType: dto.actionType,
          parameters: dto.parameters,
          actorEmail: 'admin@pfis.com',
          actorRole: 'admin',
          status: ActionStatus.APPLIED,
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('getHistory()', () => {
    it('returns paginated action history', async () => {
      repoMock.findAndCount.mockResolvedValue([[mockAction()], 1]);

      const result = await service.getHistory(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('normalizes invalid page/limit bounds', async () => {
      repoMock.findAndCount.mockResolvedValue([[], 0]);

      await service.getHistory(-4, 1000);

      expect(repoMock.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 100,
        }),
      );
    });
  });

  describe('updateStatus()', () => {
    it('updates status and persists when action exists', async () => {
      const existing = mockAction({
        status: ActionStatus.QUEUED,
        appliedAt: undefined,
      });
      repoMock.findOne.mockResolvedValue(existing);
      repoMock.save.mockImplementation((x: ActionLog) => Promise.resolve(x));

      const result = await service.updateStatus(existing.id, {
        status: ActionStatus.APPLIED,
      });

      expect(result.status).toBe(ActionStatus.APPLIED);
      expect(result.appliedAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when action does not exist', async () => {
      repoMock.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('d2f51cec-b953-4326-a90a-b2d2f8169db2', {
          status: ActionStatus.FAILED,
          errorMessage: 'failed during execution',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

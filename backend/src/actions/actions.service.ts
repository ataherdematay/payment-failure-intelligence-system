import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionLog, ActionStatus } from './action-log.entity';
import { ExecuteActionDto } from './dto/execute-action.dto';
import { UpdateActionStatusDto } from './dto/update-action-status.dto';

@Injectable()
export class ActionsService {
  constructor(
    @InjectRepository(ActionLog)
    private readonly repo: Repository<ActionLog>,
  ) {}

  async executeAction(
    dto: ExecuteActionDto,
    actor: { email?: string; role?: string },
  ): Promise<ActionLog> {
    const action = this.repo.create({
      insightId: dto.insightId,
      actionType: dto.actionType,
      parameters: dto.parameters,
      actorEmail: actor.email ?? 'unknown@pfis.local',
      actorRole: actor.role ?? 'admin',
      status: ActionStatus.APPLIED,
      appliedAt: new Date(),
    });

    return this.repo.save(action);
  }

  async getHistory(page = 1, limit = 20) {
    const safePage = page > 0 ? page : 1;
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const [data, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateActionStatusDto,
  ): Promise<ActionLog> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Action ${id} not found`);
    }

    existing.status = dto.status;
    existing.errorMessage = dto.errorMessage;
    existing.appliedAt =
      dto.status === ActionStatus.APPLIED ? new Date() : existing.appliedAt;

    return this.repo.save(existing);
  }
}

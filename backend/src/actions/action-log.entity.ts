import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ActionType {
  ENABLE_RETRY = 'enable_retry',
  REDUCE_GATEWAY_WEIGHT = 'reduce_gateway_weight',
  CREATE_ALERT = 'create_alert',
  MARK_INVESTIGATING = 'mark_investigating',
  MARK_RESOLVED = 'mark_resolved',
}

export enum ActionStatus {
  QUEUED = 'queued',
  APPLIED = 'applied',
  FAILED = 'failed',
}

@Entity('action_logs')
@Index(['insightId', 'createdAt'])
@Index(['status', 'createdAt'])
export class ActionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'insight_id', type: 'varchar', length: 120 })
  insightId: string;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: ActionType,
  })
  actionType: ActionType;

  @Column({ type: 'jsonb', nullable: true })
  parameters?: Record<string, unknown>;

  @Column({ name: 'actor_email', type: 'varchar', length: 255 })
  actorEmail: string;

  @Column({ name: 'actor_role', type: 'varchar', length: 50, default: 'admin' })
  actorRole: string;

  @Column({
    type: 'enum',
    enum: ActionStatus,
    default: ActionStatus.QUEUED,
  })
  status: ActionStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'applied_at', type: 'timestamptz', nullable: true })
  appliedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

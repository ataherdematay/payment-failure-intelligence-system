import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum TransactionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

export enum FailureReason {
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  FRAUD_SUSPECTED = 'fraud_suspected',
  NETWORK_ERROR = 'network_error',
  EXPIRED_CARD = 'expired_card',
  INVALID_CREDENTIALS = 'invalid_credentials',
}

export enum Device {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
}

@Entity('transactions')
@Index(['status', 'createdAt'])
export class Transaction {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', length: 50 })
  userId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Index()
  @Column({ length: 2 })
  country: string;

  @Index()
  @Column({ length: 10 })
  device: string;

  @Index()
  @Column({ name: 'payment_method', length: 20 })
  paymentMethod: string;

  @Column({ length: 30 })
  gateway: string;

  @Index()
  @Column({ length: 10 })
  status: string;

  @Index()
  @Column({ type: 'varchar', name: 'failure_reason', length: 25, nullable: true })
  failureReason: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'risk_score', type: 'decimal', precision: 3, scale: 2, default: 0 })
  riskScore: number;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

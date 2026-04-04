import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const ML_URL  = process.env.NEXT_PUBLIC_ML_URL  || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export const mlClient = axios.create({
  baseURL: ML_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Types ─────────────────────────────────────────────────────────────────

export type FailureReason =
  | 'insufficient_funds'
  | 'network_error'
  | 'fraud_suspected'
  | 'expired_card'
  | 'invalid_credentials';

export type TransactionStatus = 'success' | 'failed' | 'pending';
export type DeviceType = 'mobile' | 'desktop' | 'tablet';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'digital_wallet';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  country: string;
  device: DeviceType;
  paymentMethod: PaymentMethod;
  gateway: string;
  status: TransactionStatus;
  failureReason?: FailureReason;
  retryCount: number;
  riskScore: number;
  createdAt: string;
}

export interface OverviewData {
  totalTransactions: number;
  failedTransactions: number;
  successfulTransactions: number;
  failureRate: number;
  revenueAtRisk: number;
  avgTransactionAmount: number;
  retrySuccessRate: number;
  periodComparison: { failureRateChange: number; transactionVolumeChange: number };
}

export interface FailureDistributionItem {
  reason: FailureReason;
  count: number;
  percentage: number;
}

export interface TimeSeriesItem {
  date: string;
  total: number;
  failed: number;
  failureRate: number;
  byReason: Record<FailureReason, number>;
}

export interface DimensionItem {
  name: string;
  total: number;
  failed: number;
  failureRate: number;
}

export interface Insight {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: { value: number; comparison?: number; unit: string; trend: 'up' | 'down' | 'stable' };
  recommendation: string;
  affectedTransactions: number;
  generatedAt: string;
}

export interface FraudFlag {
  transactionId: string;
  riskScore: number;
  flags: string[];
  recommendation: string;
}

export interface RetrySuggestion {
  transactionId: string;
  retryRecommended: boolean;
  successProbability: number;
  reasoning: string;
  optimalRetryDelay: number;
  maxRetries: number;
}

export interface PredictRequest {
  amount: number;
  device: DeviceType;
  country: string;
  payment_method: PaymentMethod;
  hour_of_day: number;
  day_of_week: number;
}

export interface PredictResponse {
  prediction: FailureReason;
  confidence: number;
  probabilities: Record<FailureReason, number>;
}

export interface ModelMetrics {
  accuracy: number;
  precision_weighted: number;
  recall_weighted: number;
  f1_weighted: number;
  per_class: Record<FailureReason, { precision: number; recall: number; f1: number }>;
  training_samples: number;
  test_samples: number;
  trained_at: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export const api = {
  // Transactions
  getTransactions: async (params?: Record<string, unknown>) =>
    unwrap<{ items: Transaction[]; total: number; page: number; limit: number; totalPages: number }>(
      await apiClient.get('/transactions', { params })
    ),

  // Analytics
  getOverview: async (params?: { startDate?: string; endDate?: string }) =>
    unwrap<OverviewData>(await apiClient.get('/analytics/overview', { params })),

  getFailureDistribution: async (params?: { startDate?: string; endDate?: string }) =>
    unwrap<FailureDistributionItem[]>(await apiClient.get('/analytics/failure-distribution', { params })),

  getTimeSeries: async (params?: { granularity?: string; startDate?: string; endDate?: string }) =>
    unwrap<TimeSeriesItem[]>(await apiClient.get('/analytics/time-series', { params })),

  getByCountry: async (params?: Record<string, unknown>) =>
    unwrap<DimensionItem[]>(await apiClient.get('/analytics/by-country', { params })),

  getByDevice: async (params?: Record<string, unknown>) =>
    unwrap<DimensionItem[]>(await apiClient.get('/analytics/by-device', { params })),

  getByPaymentMethod: async (params?: Record<string, unknown>) =>
    unwrap<DimensionItem[]>(await apiClient.get('/analytics/by-payment-method', { params })),

  // Insights
  getInsights: async () =>
    unwrap<Insight[]>(await apiClient.get('/insights')),

  getFraudFlags: async () =>
    unwrap<FraudFlag[]>(await apiClient.get('/insights/fraud-flags')),

  getRetrySuggestion: async (transactionId: string) =>
    unwrap<RetrySuggestion>(await apiClient.get(`/insights/retry-suggestion/${transactionId}`)),

  // ML Service
  predict: async (body: PredictRequest): Promise<PredictResponse> =>
    (await mlClient.post('/predict', body)).data,

  getModelMetrics: async (): Promise<ModelMetrics> =>
    (await mlClient.get('/model/metrics')).data,

  getMLHealth: async () =>
    (await mlClient.get('/health')).data,
};

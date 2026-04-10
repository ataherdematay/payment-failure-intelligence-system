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

// ─── Types ──────────────────────────────────────────────────────────────────

export type FailureReason =
  | 'insufficient_funds'
  | 'network_error'
  | 'fraud_suspected'
  | 'expired_card'
  | 'invalid_credentials';

export type TransactionStatus = 'success' | 'failed' | 'pending';
export type DeviceType        = 'mobile' | 'desktop' | 'tablet';
export type PaymentMethod     = 'credit_card' | 'debit_card' | 'bank_transfer' | 'digital_wallet';

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

// Backend returns { data: [], meta: { total, page, limit, totalPages } }
export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface SummaryData {
  total: number;
  failed: number;
  success: number;
  pending: number;
  failureRate: string;
  avgRiskScore: string;
}

// Analytics raw shapes (what backend actually returns)
export interface FailureByReasonItem {
  reason: FailureReason;
  count: string;
  avgRisk: string;
}

export interface DimensionItem {
  country?: string;
  device?: string;
  paymentMethod?: string;
  gateway?: string;
  total: string;
  failed: string;
  failureRate: string;
  avgAmount?: string;
}

export interface DailyTrendItem {
  date: string;
  total: string;
  failed: string;
  success: string;
}

export interface HourlyItem {
  hour: number;
  total: string;
  failed: string;
}

export interface RevenueLost {
  totalRevenue: string;
  lostRevenue: string;
  lostPercent: string;
}

// Insights (from backend /api/v1/insights)
export interface Insight {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  metric: string;
  recommendation: string;
  // Optional extended fields
  severity?: 'low' | 'medium' | 'high' | 'critical';
  affectedTransactions?: number;
  generatedAt?: string;
}

// ML
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

// ─── API Functions ───────────────────────────────────────────────────────────

export const api = {
  // ── Transactions ──
  getTransactions: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get<PaginatedResponse<Transaction>>('/transactions', { params });
    const { data: items, meta } = res.data;
    return {
      items: items.map(tx => ({
        ...tx,
        amount:    typeof tx.amount    === 'string' ? parseFloat(tx.amount)    : tx.amount,
        riskScore: typeof tx.riskScore === 'string' ? parseFloat(tx.riskScore) : tx.riskScore,
      })),
      total:      meta.total,
      page:       meta.page,
      limit:      meta.limit,
      totalPages: meta.totalPages,
    };
  },

  getSummary: async () => {
    const res = await apiClient.get<SummaryData>('/transactions/summary');
    return res.data;
  },

  // ── Analytics (map backend paths → frontend usage) ──
  getFailureByReason: async () => {
    const res = await apiClient.get<FailureByReasonItem[]>('/analytics/failure-by-reason');
    return res.data;
  },

  getByCountry: async () => {
    const res = await apiClient.get<DimensionItem[]>('/analytics/failure-by-country');
    return res.data;
  },

  getByDevice: async () => {
    const res = await apiClient.get<DimensionItem[]>('/analytics/failure-by-device');
    return res.data;
  },

  getByPaymentMethod: async () => {
    const res = await apiClient.get<DimensionItem[]>('/analytics/failure-by-payment-method');
    return res.data;
  },

  getDailyTrend: async (days = 30) => {
    const res = await apiClient.get<DailyTrendItem[]>('/analytics/daily-trend', { params: { days } });
    return res.data;
  },

  getHourlyPattern: async () => {
    const res = await apiClient.get<HourlyItem[]>('/analytics/hourly-pattern');
    return res.data;
  },

  getGatewayPerformance: async () => {
    const res = await apiClient.get<DimensionItem[]>('/analytics/gateway-performance');
    return res.data;
  },

  getRevenueLost: async () => {
    const res = await apiClient.get<RevenueLost>('/analytics/revenue-lost');
    return res.data;
  },

  // ── Insights ──
  getInsights: async () => {
    const res = await apiClient.get<Insight[]>('/insights');
    return res.data;
  },

  // ── ML Service ──
  predict: async (body: PredictRequest): Promise<PredictResponse> =>
    (await mlClient.post('/predict', body)).data,

  getModelMetrics: async (): Promise<ModelMetrics> =>
    (await mlClient.get('/model/metrics')).data,

  getMLHealth: async () =>
    (await mlClient.get('/health')).data,
};

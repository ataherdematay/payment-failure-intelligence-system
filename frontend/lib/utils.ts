import { FailureReason } from './api';

export const FAILURE_REASON_LABELS: Record<FailureReason, string> = {
  insufficient_funds: 'Insufficient Funds',
  network_error: 'Network Error',
  fraud_suspected: 'Fraud Suspected',
  expired_card: 'Expired Card',
  invalid_credentials: 'Invalid Credentials',
};

export const FAILURE_REASON_COLORS: Record<FailureReason, string> = {
  insufficient_funds: '#6366f1',
  network_error: '#8b5cf6',
  fraud_suspected: '#ef4444',
  expired_card: '#f59e0b',
  invalid_credentials: '#ec4899',
};

export const SEVERITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

export const SEVERITY_BG = {
  low: 'rgba(16,185,129,0.12)',
  medium: 'rgba(245,158,11,0.12)',
  high: 'rgba(239,68,68,0.12)',
  critical: 'rgba(220,38,38,0.15)',
};

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getChangeColor(change: number): string {
  if (change > 0) return 'var(--accent-danger)';
  if (change < 0) return 'var(--accent-success)';
  return 'var(--text-secondary)';
}

export function getChangeIcon(change: number): string {
  if (change > 0) return '↑';
  if (change < 0) return '↓';
  return '→';
}

'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { FAILURE_REASON_COLORS, FAILURE_REASON_LABELS, formatDate } from '@/lib/utils';
import { FailureReason } from '@/lib/api';

interface TimeSeriesItem {
  date: string;
  failureRate: number;
  byReason?: Record<string, number>;
}

const REASONS: FailureReason[] = [
  'insufficient_funds', 'network_error', 'fraud_suspected', 'expired_card', 'invalid_credentials',
];

interface Props { data: TimeSeriesItem[]; stacked?: boolean }

export function TimeSeriesChart({ data, stacked = false }: Props) {
  const chartData = data.map(d => ({
    date: formatDate(d.date),
    failureRate: d.failureRate,
    ...d.byReason,
  }));

  if (stacked) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            {REASONS.map(r => (
              <linearGradient key={r} id={`grad-${r}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={FAILURE_REASON_COLORS[r]} stopOpacity={0.7} />
                <stop offset="95%" stopColor={FAILURE_REASON_COLORS[r]} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            formatter={(v, name) => [v as number, FAILURE_REASON_LABELS[name as FailureReason] ?? String(name)]}
          />
          <Legend formatter={(v: string) => FAILURE_REASON_LABELS[v as FailureReason] ?? v} wrapperStyle={{ fontSize: 11 }} />
          {REASONS.map(r => (
            <Area
              key={r}
              type="monotone"
              dataKey={r}
              stackId="1"
              stroke={FAILURE_REASON_COLORS[r]}
              fill={`url(#grad-${r})`}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="grad-rate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [`${(v as number).toFixed(1)}%`, 'Failure Rate']}
        />
        <Area
          type="monotone"
          dataKey="failureRate"
          stroke="#6366f1"
          fill="url(#grad-rate)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#6366f1' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

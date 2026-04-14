'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { DimensionItem } from '@/lib/api';
import { formatPercent } from '@/lib/utils';

interface Props {
  data: DimensionItem[];
  color?: string;
  layout?: 'horizontal' | 'vertical';
}

export function DimensionBarChart({ data, color = '#6366f1', layout = 'horizontal' }: Props) {
  const chartData = data.map(d => ({
    name: d.name ?? d.country ?? d.device ?? d.paymentMethod ?? d.gateway ?? '—',
    failureRate: parseFloat(parseFloat(d.failureRate).toFixed(1)),
  }));

  if (layout === 'vertical') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis
            type="number"
            unit="%"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [formatPercent(v as number), 'Failure Rate']}
          />
          <Bar dataKey="failureRate" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={1 - i * 0.12} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
        <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [formatPercent(v as number), 'Failure Rate']}
        />
        <Bar dataKey="failureRate" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={color} fillOpacity={1 - i * 0.12} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

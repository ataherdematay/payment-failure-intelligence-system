'use client';

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { FAILURE_REASON_COLORS, FAILURE_REASON_LABELS, formatNumber } from '@/lib/utils';
import { FailureDistributionItem } from '@/lib/api';

interface Props { data: FailureDistributionItem[] }

const RADIAN = Math.PI / 180;

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
}) {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function FailureDistributionChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="75%"
          dataKey="count"
          nameKey="reason"
          labelLine={false}
          label={CustomLabel as unknown as boolean}
          strokeWidth={0}
        >
          {data.map(entry => (
            <Cell
              key={entry.reason}
              fill={FAILURE_REASON_COLORS[entry.reason]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [
            `${formatNumber(value)} transactions`,
            FAILURE_REASON_LABELS[name as keyof typeof FAILURE_REASON_LABELS] ?? name,
          ]}
        />
        <Legend
          formatter={(value: string) =>
            FAILURE_REASON_LABELS[value as keyof typeof FAILURE_REASON_LABELS] ?? value
          }
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

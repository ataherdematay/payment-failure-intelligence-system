'use client';

import { useQuery } from '@tanstack/react-query';
import { api, FailureByReasonItem, DimensionItem, DailyTrendItem } from '@/lib/api';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FAILURE_REASON_LABELS, FAILURE_REASON_COLORS } from '@/lib/utils';
import {
  AlertTriangle, TrendingDown, DollarSign, Activity,
  CreditCard, Smartphone, Globe, BarChart2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';

export default function OverviewPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['summary'],
    queryFn: () => api.getSummary(),
    staleTime: 30_000,
  });

  const { data: byReason = [], isLoading: loadingReason } = useQuery({
    queryKey: ['failure-by-reason'],
    queryFn: () => api.getFailureByReason(),
    staleTime: 60_000,
  });

  const { data: dailyTrend = [], isLoading: loadingTrend } = useQuery({
    queryKey: ['daily-trend'],
    queryFn: () => api.getDailyTrend(30),
    staleTime: 60_000,
  });

  const { data: byDevice = [], isLoading: loadingDevice } = useQuery({
    queryKey: ['by-device'],
    queryFn: () => api.getByDevice(),
    staleTime: 60_000,
  });

  const { data: byCountry = [], isLoading: loadingCountry } = useQuery({
    queryKey: ['by-country'],
    queryFn: () => api.getByCountry(),
    staleTime: 60_000,
  });

  const { data: revenueLost, isLoading: loadingRevenue } = useQuery({
    queryKey: ['revenue-lost'],
    queryFn: () => api.getRevenueLost(),
    staleTime: 60_000,
  });

  const { data: transactions, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => api.getTransactions({ limit: 8 }),
    staleTime: 30_000,
  });

  // Chart data transformations
  const pieData = byReason.map(item => ({
    name: FAILURE_REASON_LABELS[item.reason] || item.reason,
    value: parseInt(item.count),
    color: FAILURE_REASON_COLORS[item.reason] || '#6366f1',
  }));

  const trendData = dailyTrend.slice(-30).map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: parseInt(item.total),
    failed: parseInt(item.failed),
    failureRate: parseInt(item.total) > 0
      ? parseFloat(((parseInt(item.failed) / parseInt(item.total)) * 100).toFixed(1))
      : 0,
  }));

  const deviceData = byDevice.map(d => ({
    name: (d.device || '').charAt(0).toUpperCase() + (d.device || '').slice(1),
    failureRate: parseFloat(d.failureRate),
    total: parseInt(d.total),
  }));

  const countryData = byCountry.map(d => ({
    name: d.country || '',
    failureRate: parseFloat(d.failureRate),
  })).sort((a, b) => b.failureRate - a.failureRate).slice(0, 6);

  const kpiGrid  = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">

      {/* KPI Cards */}
      <div style={kpiGrid}>
        <KPICard
          title="Total Transactions"
          value={summary ? parseInt(summary.total as unknown as string).toLocaleString() : '—'}
          icon={<CreditCard size={14} />}
          accentColor="var(--accent-primary)"
          loading={loadingSummary}
        />
        <KPICard
          title="Failure Rate"
          value={summary ? `${summary.failureRate}%` : '—'}
          subtitle="of all transactions"
          icon={<AlertTriangle size={14} />}
          accentColor="var(--accent-danger)"
          loading={loadingSummary}
        />
        <KPICard
          title="Revenue at Risk"
          value={revenueLost ? `$${parseFloat(revenueLost.lostRevenue).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
          subtitle={revenueLost ? `${revenueLost.lostPercent}% of total` : ''}
          icon={<DollarSign size={14} />}
          accentColor="var(--accent-warning)"
          loading={loadingRevenue}
        />
        <KPICard
          title="Avg Risk Score"
          value={summary?.avgRiskScore ?? '—'}
          subtitle="portfolio-wide average"
          icon={<Activity size={14} />}
          accentColor="var(--accent-secondary)"
          loading={loadingSummary}
        />
      </div>

      {/* Failure Distribution + Daily Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <ChartCard title="Failure by Reason" subtitle="Distribution of failure causes" loading={loadingReason} height={280}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [value.toLocaleString(), 'Failures']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {pieData.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{item.name}</span>
                <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Daily Failure Rate" subtitle="30-day trend" loading={loadingTrend} height={280}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false}
                interval={Math.floor(trendData.length / 6)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false}
                tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Failure Rate']}
              />
              <Area type="monotone" dataKey="failureRate" stroke="#ef4444" strokeWidth={2}
                fill="url(#failGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Device + Country */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Failure by Device" subtitle="Mobile vs Desktop vs Tablet" loading={loadingDevice} height={220}
          action={<Smartphone size={14} color="var(--text-muted)" />}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={deviceData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Failure Rate']}
              />
              <Bar dataKey="failureRate" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Failure by Country" subtitle="Top markets" loading={loadingCountry} height={220}
          action={<Globe size={14} color="var(--text-muted)" />}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={countryData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Failure Rate']}
              />
              <Bar dataKey="failureRate" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent Transactions */}
      <div className="glass" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Recent Transactions
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Latest activity</p>
          </div>
          <TrendingDown size={14} color="var(--text-muted)" />
        </div>

        {loadingTx ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8, borderRadius: 6 }} />
          ))
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Amount', 'Status', 'Failure Reason', 'Country', 'Device', 'Gateway', 'Risk', 'Date'].map(h => (
                    <th key={h} style={{
                      padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)',
                      fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions?.items.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px' }}><StatusBadge status={tx.status} /></td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                      {tx.failureReason ? FAILURE_REASON_LABELS[tx.failureReason] : '—'}
                    </td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{tx.country}</td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tx.device}</td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tx.gateway}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
                        color: tx.riskScore > 0.6 ? 'var(--accent-danger)' : tx.riskScore > 0.3 ? 'var(--accent-warning)' : 'var(--accent-success)',
                      }}>
                        {tx.riskScore.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

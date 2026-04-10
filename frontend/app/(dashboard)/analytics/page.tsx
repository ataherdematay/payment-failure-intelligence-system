'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FAILURE_REASON_LABELS, FAILURE_REASON_COLORS } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ChartCard } from '@/components/ui/ChartCard';
import { Filter } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterReason,  setFilterReason]  = useState('');
  const [currentPage,   setCurrentPage]   = useState(1);

  const { data: byPaymentMethod = [], isLoading: loadingPM } = useQuery({
    queryKey: ['by-payment-method'],
    queryFn: () => api.getByPaymentMethod(),
    staleTime: 60_000,
  });

  const { data: dailyTrend = [], isLoading: loadingTrend } = useQuery({
    queryKey: ['daily-trend-analytics'],
    queryFn: () => api.getDailyTrend(60),
    staleTime: 60_000,
  });

  const { data: hourly = [], isLoading: loadingHourly } = useQuery({
    queryKey: ['hourly-pattern'],
    queryFn: () => api.getHourlyPattern(),
    staleTime: 60_000,
  });

  const { data: gateway = [], isLoading: loadingGateway } = useQuery({
    queryKey: ['gateway-performance'],
    queryFn: () => api.getGatewayPerformance(),
    staleTime: 60_000,
  });

  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions-table', currentPage, filterStatus, filterReason],
    queryFn: () => api.getTransactions({
      page: currentPage,
      limit: 15,
      ...(filterStatus && { status: filterStatus }),
      ...(filterReason && { failureReason: filterReason }),
    }),
    staleTime: 30_000,
  });

  const inputStyle = {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    borderRadius: 6, color: 'var(--text-primary)', fontSize: 12,
    padding: '6px 10px', outline: 'none',
  };

  // chart data
  const trendData = dailyTrend.slice(-30).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    failed: parseInt(d.failed),
    success: parseInt(d.success),
  }));

  const hourlyData = hourly.map(h => ({
    hour: `${h.hour}:00`,
    failureRate: parseInt(h.total) > 0
      ? parseFloat(((parseInt(h.failed) / parseInt(h.total)) * 100).toFixed(1))
      : 0,
  }));

  const pmData = byPaymentMethod.map(d => ({
    name: (d.paymentMethod || '').replace('_', ' '),
    failureRate: parseFloat(d.failureRate),
    total: parseInt(d.total),
  }));

  const gwData = gateway.map(d => ({
    name: d.gateway || '',
    failureRate: parseFloat(d.failureRate),
    avgAmount: parseFloat(d.avgAmount || '0'),
  }));

  const REASONS = ['insufficient_funds','network_error','fraud_suspected','expired_card','invalid_credentials'] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <ChartCard title="Daily Volume Trend" subtitle="Success vs Failed — last 30 days" loading={loadingTrend} height={280}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="succGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="failGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false}
                interval={Math.floor(trendData.length / 6)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="success" stroke="#10b981" strokeWidth={1.5} fill="url(#succGrad)" dot={false} name="Success" />
              <Area type="monotone" dataKey="failed"  stroke="#ef4444" strokeWidth={1.5} fill="url(#failGrad2)" dot={false} name="Failed" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Method Failure Rate" subtitle="By method" loading={loadingPM} height={280}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pmData} layout="vertical" margin={{ top: 0, right: 20, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Failure Rate']} />
              <Bar dataKey="failureRate" fill="#14b8a6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Hourly Failure Pattern" subtitle="Failure rate by hour of day (24h)" loading={loadingHourly} height={240}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Failure Rate']} />
              <Bar dataKey="failureRate" radius={[3, 3, 0, 0]}
                fill="#8b5cf6"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gateway Performance" subtitle="Failure rate per gateway" loading={loadingGateway} height={240}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gwData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Failure Rate']} />
              <Bar dataKey="failureRate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Transaction table with filters */}
      <div className="glass" style={{ padding: '20px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Filter size={14} color="var(--text-muted)" />
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={inputStyle}>
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <select value={filterReason} onChange={e => { setFilterReason(e.target.value); setCurrentPage(1); }} style={inputStyle}>
            <option value="">All Reasons</option>
            {REASONS.map(r => <option key={r} value={r}>{FAILURE_REASON_LABELS[r]}</option>)}
          </select>
          {(filterStatus || filterReason) && (
            <button onClick={() => { setFilterStatus(''); setFilterReason(''); setCurrentPage(1); }}
              style={{ ...inputStyle, cursor: 'pointer', color: 'var(--accent-danger)', borderColor: 'rgba(239,68,68,0.3)' }}>
              Clear
            </button>
          )}
          {txData && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              {txData.total.toLocaleString()} records
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Amount', 'Status', 'Failure Reason', 'Country', 'Device', 'Method', 'Risk', 'Retries', 'Date'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)',
                    fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px',
                    borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingTx
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} style={{ padding: 8 }}>
                        <div className="skeleton" style={{ height: 16, width: '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
                : txData?.items.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '9px 10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '9px 10px' }}><StatusBadge status={tx.status} /></td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>
                      {tx.failureReason ? FAILURE_REASON_LABELS[tx.failureReason] : '—'}
                    </td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{tx.country}</td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tx.device}</td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {tx.paymentMethod.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
                        color: tx.riskScore > 0.6 ? 'var(--accent-danger)' : tx.riskScore > 0.3 ? 'var(--accent-warning)' : 'var(--accent-success)',
                      }}>
                        {tx.riskScore.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-muted)', textAlign: 'center' }}>{tx.retryCount}</td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {txData && txData.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)',
                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
                opacity: currentPage === 1 ? 0.4 : 1,
              }}>
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentPage} / {txData.totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(txData.totalPages, p + 1))} disabled={currentPage === txData.totalPages}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)',
                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
                opacity: currentPage === txData.totalPages ? 0.4 : 1,
              }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

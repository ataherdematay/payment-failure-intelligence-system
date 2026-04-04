'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FailureDistributionChart } from '@/components/charts/FailureDistributionChart';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { DimensionBarChart } from '@/components/charts/DimensionBarChart';
import {
  formatCurrency, formatNumber, formatPercent,
  FAILURE_REASON_LABELS,
} from '@/lib/utils';
import {
  AlertTriangle, TrendingDown, DollarSign, RefreshCw,
  CreditCard, Smartphone, Globe,
} from 'lucide-react';

export default function OverviewPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview(),
    staleTime: 30_000,
  });

  const { data: distribution = [], isLoading: loadingDist } = useQuery({
    queryKey: ['failure-distribution'],
    queryFn: () => api.getFailureDistribution(),
    staleTime: 60_000,
  });

  const { data: timeSeries = [], isLoading: loadingTs } = useQuery({
    queryKey: ['time-series'],
    queryFn: () => api.getTimeSeries({ granularity: 'daily' }),
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

  const { data: transactions, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => api.getTransactions({ limit: 8, sortBy: 'createdAt', sortOrder: 'DESC' }),
    staleTime: 30_000,
  });

  const kpiGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">

      {/* KPI Cards */}
      <div style={kpiGrid}>
        <KPICard
          title="Total Transactions"
          value={overview ? formatNumber(overview.totalTransactions) : '—'}
          change={overview?.periodComparison.transactionVolumeChange}
          changeLabel="vs last period"
          icon={<CreditCard size={14} />}
          accentColor="var(--accent-primary)"
          loading={loadingOverview}
        />
        <KPICard
          title="Failure Rate"
          value={overview ? formatPercent(overview.failureRate) : '—'}
          change={overview?.periodComparison.failureRateChange}
          changeLabel="vs last period"
          icon={<AlertTriangle size={14} />}
          accentColor="var(--accent-danger)"
          loading={loadingOverview}
        />
        <KPICard
          title="Revenue at Risk"
          value={overview ? formatCurrency(overview.revenueAtRisk) : '—'}
          subtitle="From failed transactions"
          icon={<DollarSign size={14} />}
          accentColor="var(--accent-warning)"
          loading={loadingOverview}
        />
        <KPICard
          title="Retry Success Rate"
          value={overview ? formatPercent(overview.retrySuccessRate) : '—'}
          subtitle="Historical retry recovery"
          icon={<RefreshCw size={14} />}
          accentColor="var(--accent-success)"
          loading={loadingOverview}
        />
      </div>

      {/* Failure Distribution + Time Series */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
        <ChartCard
          title="Failure Distribution"
          subtitle="By reason category"
          loading={loadingDist}
          height={280}
        >
          <FailureDistributionChart data={distribution} />
        </ChartCard>

        <ChartCard
          title="Failure Rate Trend"
          subtitle="Daily failure rate over the last 30 days"
          loading={loadingTs}
          height={280}
        >
          <TimeSeriesChart data={timeSeries} />
        </ChartCard>
      </div>

      {/* Device + Country */}
      <div style={grid2}>
        <ChartCard
          title="Failure by Device"
          subtitle="Mobile vs Desktop vs Tablet"
          loading={loadingDevice}
          height={220}
          action={<Smartphone size={14} color="var(--text-muted)" />}
        >
          <DimensionBarChart data={byDevice} color="#6366f1" layout="horizontal" />
        </ChartCard>

        <ChartCard
          title="Failure by Country"
          subtitle="Top markets failure rates"
          loading={loadingCountry}
          height={220}
          action={<Globe size={14} color="var(--text-muted)" />}
        >
          <DimensionBarChart data={byCountry} color="#8b5cf6" layout="vertical" />
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
                  {['Amount', 'Status', 'Failure Reason', 'Country', 'Device', 'Gateway', 'Date'].map(h => (
                    <th key={h} style={{
                      padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)',
                      fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions?.items.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'default' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <StatusBadge status={tx.status} />
                    </td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                      {tx.failureReason ? FAILURE_REASON_LABELS[tx.failureReason] : '—'}
                    </td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{tx.country}</td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tx.device}</td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tx.gateway}</td>
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

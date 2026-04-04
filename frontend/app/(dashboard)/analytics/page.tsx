'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ChartCard } from '@/components/ui/ChartCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { DimensionBarChart } from '@/components/charts/DimensionBarChart';
import { FAILURE_REASON_LABELS, formatPercent, formatCurrency } from '@/lib/utils';
import { FailureReason } from '@/lib/api';
import { Filter, Download } from 'lucide-react';

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterReason, setFilterReason] = useState('');

  const params = {
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data: timeSeries = [], isLoading: loadingTs } = useQuery({
    queryKey: ['time-series-stacked', params],
    queryFn: () => api.getTimeSeries({ granularity: 'daily', ...params }),
    staleTime: 60_000,
  });

  const { data: byPaymentMethod = [], isLoading: loadingPM } = useQuery({
    queryKey: ['by-payment-method', params],
    queryFn: () => api.getByPaymentMethod(params),
    staleTime: 60_000,
  });

  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions', currentPage, filterStatus, filterReason],
    queryFn: () => api.getTransactions({
      page: currentPage,
      limit: 15,
      ...(filterStatus && { status: filterStatus }),
      ...(filterReason && { failureReason: filterReason }),
    }),
    staleTime: 30_000,
  });

  const inputStyle = {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 12,
    padding: '6px 10px',
    outline: 'none',
  };

  const REASONS: FailureReason[] = ['insufficient_funds', 'network_error', 'fraud_suspected', 'expired_card', 'invalid_credentials'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">

      {/* Filters */}
      <div className="glass" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Filter size={14} color="var(--text-muted)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>From</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>To</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <select value={filterReason} onChange={e => setFilterReason(e.target.value)} style={inputStyle}>
            <option value="">All Reasons</option>
            {REASONS.map(r => (
              <option key={r} value={r}>{FAILURE_REASON_LABELS[r]}</option>
            ))}
          </select>
          {(startDate || endDate || filterStatus || filterReason) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setFilterStatus(''); setFilterReason(''); }}
              style={{ ...inputStyle, cursor: 'pointer', color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)33' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stacked Area + Payment Method */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <ChartCard title="Failure Trends by Reason" subtitle="Stacked area — failures over time" loading={loadingTs} height={300}>
          <TimeSeriesChart data={timeSeries} stacked />
        </ChartCard>
        <ChartCard title="Payment Method Comparison" subtitle="Failure rates by method" loading={loadingPM} height={300}>
          <DimensionBarChart data={byPaymentMethod} color="#14b8a6" layout="vertical" />
        </ChartCard>
      </div>

      {/* Data Table */}
      <div className="glass" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Transactions</h3>
            {txData && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{txData.total.toLocaleString()} total records</p>}
          </div>
          <Download size={14} color="var(--text-muted)" />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Amount', 'Currency', 'Status', 'Failure Reason', 'Country', 'Device', 'Payment Method', 'Risk Score', 'Retries', 'Date'].map(h => (
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
                    {Array.from({ length: 10 }).map((__, j) => (
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
                    <td style={{ padding: '9px 10px', color: 'var(--text-muted)' }}>{tx.currency}</td>
                    <td style={{ padding: '9px 10px' }}><StatusBadge status={tx.status} /></td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>
                      {tx.failureReason ? FAILURE_REASON_LABELS[tx.failureReason] : '—'}
                    </td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{tx.country}</td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tx.device}</td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {tx.paymentMethod.replace('_', ' ')}
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
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)',
                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
                opacity: currentPage === 1 ? 0.4 : 1,
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {currentPage} / {txData.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(txData.totalPages, p + 1))}
              disabled={currentPage === txData.totalPages}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)',
                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
                opacity: currentPage === txData.totalPages ? 0.4 : 1,
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

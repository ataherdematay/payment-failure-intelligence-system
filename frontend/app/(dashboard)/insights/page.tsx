'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SEVERITY_COLORS, SEVERITY_BG } from '@/lib/utils';
import {
  AlertTriangle, TrendingDown, ShieldAlert, Wifi,
  CreditCard, Zap, CheckCircle, Info, AlertCircle, XCircle,
} from 'lucide-react';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  critical:    <XCircle     size={16} />,
  high:        <AlertTriangle size={16} />,
  warning:     <AlertCircle  size={16} />,
  info:        <Info          size={16} />,
  low:         <CheckCircle   size={16} />,
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Overview:          <TrendingDown size={14} />,
  'Failure Analysis': <AlertTriangle size={14} />,
  'Gateway Health':   <Wifi size={14} />,
  'Device Analysis':  <CreditCard size={14} />,
  'Temporal Patterns':<Zap size={14} />,
  'Fraud Detection':  <ShieldAlert size={14} />,
};

export default function InsightsPage() {
  const { data: insights = [], isLoading, error } = useQuery({
    queryKey: ['insights'],
    queryFn: () => api.getInsights(),
    staleTime: 60_000,
    retry: 1,
  });

  const critical = insights.filter(i => i.severity === 'critical');
  const high     = insights.filter(i => i.severity === 'high');
  const others   = insights.filter(i => i.severity !== 'critical' && i.severity !== 'high');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">

      {/* Header */}
      <div className="glass" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-danger)',
          }}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Actionable Insights
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              AI-generated recommendations from your transaction data
            </p>
          </div>
          {!isLoading && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {[
                { label: 'Critical', count: critical.length, color: '#dc2626' },
                { label: 'High',     count: high.length,     color: '#ef4444' },
                { label: 'Other',    count: others.length,   color: 'var(--text-muted)' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{
                  padding: '4px 12px', borderRadius: 20,
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ color }}>{count}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass skeleton" style={{ height: 120, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass" style={{
          padding: 24, textAlign: 'center',
          borderColor: 'rgba(239,68,68,0.3)',
        }}>
          <AlertTriangle size={32} color="var(--accent-danger)" style={{ marginBottom: 8 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Could not load insights — make sure the backend is running.
          </p>
        </div>
      )}

      {/* Insights grid */}
      {!isLoading && !error && insights.length === 0 && (
        <div className="glass" style={{ padding: 40, textAlign: 'center' }}>
          <CheckCircle size={32} color="var(--accent-success)" style={{ marginBottom: 8 }} />
          <p style={{ color: 'var(--text-secondary)' }}>No insights generated — your system looks healthy!</p>
        </div>
      )}

      {!isLoading && insights.map((insight) => {
        const sev = (insight.severity || insight.type || 'info') as keyof typeof SEVERITY_COLORS;
        const color = SEVERITY_COLORS[sev] || 'var(--accent-info)';
        const bg    = SEVERITY_BG[sev]    || 'rgba(59,130,246,0.08)';

        return (
          <div
            key={insight.id}
            className="glass fade-in"
            style={{
              padding: '20px 24px',
              borderLeft: `3px solid ${color}`,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
          >
            <div style={{ display: 'flex', gap: 16 }}>

              {/* Icon */}
              <div style={{
                flexShrink: 0,
                width: 36, height: 36, borderRadius: 9,
                background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color,
              }}>
                {TYPE_ICONS[sev] || <Info size={16} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {insight.title}
                  </h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: bg, color, textTransform: 'uppercase', letterSpacing: '0.6px',
                    }}>
                      {sev}
                    </span>
                    {insight.category && (
                      <span style={{
                        fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                        background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {CATEGORY_ICONS[insight.category]}
                        {insight.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.6 }}>
                  {insight.description}
                </p>

                {/* Metric chip */}
                {insight.metric && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 20,
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                    marginBottom: 10,
                  }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color }}>
                      {typeof insight.metric === 'object'
                        ? `${insight.metric.value}${insight.metric.unit}`
                        : insight.metric}
                    </span>
                  </div>
                )}

                {/* Recommendation */}
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-primary)', marginRight: 6 }}>
                    RECOMMENDATION
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {insight.recommendation}
                  </span>
                </div>

                {/* Affected + timestamp */}
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  {insight.affectedTransactions != null && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {insight.affectedTransactions.toLocaleString()} affected transactions
                    </span>
                  )}
                  {insight.generatedAt && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(insight.generatedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

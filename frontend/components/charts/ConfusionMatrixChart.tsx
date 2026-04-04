'use client';

import { ModelMetrics, FailureReason } from '@/lib/api';
import { FAILURE_REASON_LABELS } from '@/lib/utils';

interface Props { metrics: ModelMetrics }

const REASONS: FailureReason[] = [
  'insufficient_funds', 'network_error', 'fraud_suspected', 'expired_card', 'invalid_credentials',
];

export function ConfusionMatrixChart({ metrics }: Props) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ padding: '6px 8px', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 500 }}>
              Class
            </th>
            <th style={{ padding: '6px 8px', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 500 }}>Precision</th>
            <th style={{ padding: '6px 8px', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 500 }}>Recall</th>
            <th style={{ padding: '6px 8px', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 500 }}>F1</th>
          </tr>
        </thead>
        <tbody>
          {REASONS.map(reason => {
            const cls = metrics.per_class[reason];
            if (!cls) return null;
            return (
              <tr key={reason} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {FAILURE_REASON_LABELS[reason]}
                </td>
                {[cls.precision, cls.recall, cls.f1].map((v, i) => (
                  <td key={i} style={{ padding: '8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 600,
                        color: v >= 0.75 ? 'var(--accent-success)' : v >= 0.6 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                      }}>
                        {(v * 100).toFixed(0)}%
                      </span>
                      <div style={{
                        height: 3, width: 40, borderRadius: 2,
                        background: 'var(--bg-tertiary)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${v * 100}%`,
                          background: v >= 0.75 ? 'var(--accent-success)' : v >= 0.6 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                          borderRadius: 2,
                          transition: 'width 0.8s ease',
                        }} />
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

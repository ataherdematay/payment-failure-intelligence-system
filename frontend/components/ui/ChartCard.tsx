'use client';

import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  height?: number;
}

export function ChartCard({ title, subtitle, children, action, loading = false, height = 300 }: ChartCardProps) {
  return (
    <div className="glass fade-in" style={{ padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
      }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: '2px' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>

      {loading ? (
        <div style={{ height }}>
          <div className="skeleton" style={{ height: '100%', borderRadius: 8 }} />
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </div>
  );
}

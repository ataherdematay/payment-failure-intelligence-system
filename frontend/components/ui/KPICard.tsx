'use client';

import { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  accentColor?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  accentColor = 'var(--accent-primary)',
  loading = false,
}: KPICardProps) {
  const isPositiveChange = change !== undefined && change < 0; // lower = better for failure rate
  const changeColor = change === undefined ? 'var(--text-muted)' : isPositiveChange ? 'var(--accent-success)' : 'var(--accent-danger)';

  if (loading) {
    return (
      <div className="glass" style={{ padding: '20px', minHeight: '110px' }}>
        <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 28, width: '40%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 10, width: '50%' }} />
      </div>
    );
  }

  return (
    <div
      className="glass fade-in"
      style={{
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = accentColor + '55';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Accent bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '2px',
        background: `linear-gradient(90deg, ${accentColor}, transparent)`,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {title}
        </span>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            background: accentColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accentColor,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mono" style={{
        fontSize: '26px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        letterSpacing: '-0.5px',
        marginBottom: '6px',
        lineHeight: 1.1,
      }}>
        {value}
      </div>

      {/* Change */}
      {(change !== undefined || subtitle) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {change !== undefined && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: changeColor }}>
              {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </span>
          )}
          {changeLabel && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{changeLabel}</span>
          )}
          {subtitle && !changeLabel && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

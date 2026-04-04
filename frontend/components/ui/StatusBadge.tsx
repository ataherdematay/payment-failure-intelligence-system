'use client';

import { FAILURE_REASON_LABELS, SEVERITY_COLORS, SEVERITY_BG } from '@/lib/utils';
import { FailureReason } from '@/lib/api';

type Status = 'success' | 'failed' | 'pending';
type Severity = 'low' | 'medium' | 'high' | 'critical';

interface StatusBadgeProps {
  status?: Status;
  severity?: Severity;
  failureReason?: FailureReason;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  success: { label: 'Success', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  failed:  { label: 'Failed',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

export function StatusBadge({ status, severity, failureReason, size = 'sm' }: StatusBadgeProps) {
  let label: string;
  let color: string;
  let bg: string;

  if (status) {
    const c = STATUS_CONFIG[status];
    label = c.label; color = c.color; bg = c.bg;
  } else if (severity) {
    label = severity.charAt(0).toUpperCase() + severity.slice(1);
    color = SEVERITY_COLORS[severity];
    bg = SEVERITY_BG[severity];
  } else if (failureReason) {
    label = FAILURE_REASON_LABELS[failureReason];
    color = '#94a3b8';
    bg = 'rgba(148,163,184,0.1)';
  } else {
    return null;
  }

  const padding = size === 'sm' ? '2px 7px' : '4px 10px';
  const fontSize = size === 'sm' ? '10px' : '12px';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding,
      borderRadius: '20px',
      background: bg,
      color,
      fontSize,
      fontWeight: 600,
      letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
      border: `1px solid ${color}33`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0,
      }} />
      {label}
    </span>
  );
}

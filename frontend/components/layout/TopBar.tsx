'use client';

import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/':            { title: 'Overview',    subtitle: 'Payment performance summary' },
  '/analytics':  { title: 'Analytics',   subtitle: 'Deep-dive transaction analysis' },
  '/insights':   { title: 'Insights',    subtitle: 'AI-generated actionable intelligence' },
  '/predictions':{ title: 'Predictions', subtitle: 'ML failure reason classifier' },
  '/simulation': { title: 'Simulation',  subtitle: 'Live transaction stream' },
};

export function TopBar() {
  const pathname = usePathname();
  const page = pageTitles[pathname] ?? pageTitles['/'];
  const now = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header style={{
      height: '64px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backdropFilter: 'blur(12px)',
    }}>
      {/* Left: Title */}
      <div>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {page.title}
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{page.subtitle}</p>
      </div>

      {/* Right: Status + Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Activity size={12} color="var(--accent-success)" />
          <span>{now}</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          borderRadius: '20px',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.2)',
          fontSize: '11px',
          color: 'var(--accent-success)',
          fontWeight: 600,
        }}>
          <div className="pulse-dot" style={{ width: 6, height: 6 }} />
          Live
        </div>
      </div>
    </header>
  );
}

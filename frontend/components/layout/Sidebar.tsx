'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Lightbulb,
  Brain,
  Activity,
  ChevronLeft,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/',            icon: LayoutDashboard, label: 'Overview' },
  { href: '/analytics',  icon: BarChart3,        label: 'Analytics' },
  { href: '/insights',   icon: Lightbulb,        label: 'Insights' },
  { href: '/predictions',icon: Brain,             label: 'Predictions' },
  { href: '/simulation', icon: Activity,          label: 'Simulation' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        width: collapsed ? '64px' : '220px',
        minHeight: '100vh',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 0 12px var(--accent-primary-glow)',
        }}>
          <Zap size={16} color="#fff" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>PFIS</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Intelligence</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 10px',
                borderRadius: '8px',
                marginBottom: '4px',
                textDecoration: 'none',
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                border: active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                fontWeight: active ? 600 : 400,
                fontSize: '13px',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-end',
            padding: '8px 10px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
        </button>
      </div>
    </aside>
  );
}

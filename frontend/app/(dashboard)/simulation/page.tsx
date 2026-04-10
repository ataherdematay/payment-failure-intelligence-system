'use client';

import { useState, useCallback } from 'react';
import { FAILURE_REASON_LABELS, FAILURE_REASON_COLORS, formatPercent, formatCurrency } from '@/lib/utils';
import { FailureReason } from '@/lib/api';
import { Play, RotateCcw, TrendingDown, DollarSign, Activity, Sliders, Zap } from 'lucide-react';

// ─── Craftgate-specific preset scenarios ─────────────────────────────────────
interface Preset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  overrides: Partial<SimParams>;
}

const PRESETS: Preset[] = [
  {
    id: 'baseline',
    label: 'Current State',
    emoji: '📊',
    description: 'Baseline portfolio — matches live dashboard data',
    overrides: {},
  },
  {
    id: 'gateway-switch',
    label: 'Drop Square Gateway',
    emoji: '🔀',
    description: 'Remove Square (39.1% failure) — route to Stripe/Adyen',
    overrides: { baseFailureRate: 0.25, networkReliability: 0.92 },
  },
  {
    id: 'retry-autopilot',
    label: 'Retry Autopilot ON',
    emoji: '🔄',
    description: 'Enable Craftgate-style smart retry for transient failures',
    overrides: { retryEnabled: true, retrySuccessRate: 0.55 },
  },
  {
    id: 'high-volume',
    label: 'Peak Season',
    emoji: '📈',
    description: '10× volume surge — Black Friday scenario',
    overrides: { totalTransactions: 100000, networkReliability: 0.72 },
  },
];

interface SimParams {
  totalTransactions: number;
  baseFailureRate:   number;
  avgTransactionAmount: number;
  mobileShare:       number;
  fraudThreshold:    number;
  networkReliability: number;
  retryEnabled:      boolean;
  retrySuccessRate:  number;
}

interface SimResult {
  totalTransactions: number;
  failedTransactions: number;
  failureRate: number;
  revenueTotal: number;
  revenueLost: number;
  revenueRecovered: number;
  byReason: Record<FailureReason, number>;
  retriesAttempted: number;
  retriesSucceeded: number;
}

const DEFAULTS: SimParams = {
  totalTransactions:    10000,
  baseFailureRate:      0.30,
  avgTransactionAmount: 150,
  mobileShare:          0.55,
  fraudThreshold:       0.15,
  networkReliability:   0.80,
  retryEnabled:         true,
  retrySuccessRate:     0.25,
};

function runSimulation(p: SimParams): SimResult {
  const mobileFailureBoost = p.mobileShare * 0.08;
  const effectiveFailureRate = Math.min(
    p.baseFailureRate + mobileFailureBoost - (p.networkReliability - 0.8) * 0.3,
    0.95
  );

  const failed = Math.round(p.totalTransactions * effectiveFailureRate);
  const success = p.totalTransactions - failed;

  // Distribute failure reasons
  const fraudShare   = p.fraudThreshold;
  const networkShare = (1 - p.networkReliability) * 1.5;
  const total        = fraudShare + networkShare + 0.40 + 0.12 + 0.10;

  const byReason: Record<FailureReason, number> = {
    insufficient_funds:   Math.round(failed * (0.40 / total)),
    network_error:        Math.round(failed * (networkShare / total)),
    fraud_suspected:      Math.round(failed * (fraudShare / total)),
    expired_card:         Math.round(failed * (0.12 / total)),
    invalid_credentials:  Math.round(failed * (0.10 / total)),
  };

  // Adjust rounding
  const sumReason = Object.values(byReason).reduce((a, b) => a + b, 0);
  byReason.insufficient_funds += failed - sumReason;

  const revenueTotal = p.totalTransactions * p.avgTransactionAmount;
  const revenueLost  = failed * p.avgTransactionAmount;

  let retriesAttempted = 0;
  let retriesSucceeded = 0;
  let revenueRecovered = 0;

  if (p.retryEnabled) {
    // Only network_error and expired_card can be retried realistically
    const retryable = (byReason.network_error || 0) + (byReason.expired_card || 0);
    retriesAttempted = retryable;
    retriesSucceeded = Math.round(retryable * p.retrySuccessRate);
    revenueRecovered = retriesSucceeded * p.avgTransactionAmount;
  }

  return {
    totalTransactions: p.totalTransactions,
    failedTransactions: failed - retriesSucceeded,
    failureRate: (failed - retriesSucceeded) / p.totalTransactions,
    revenueTotal,
    revenueLost: revenueLost - revenueRecovered,
    revenueRecovered,
    byReason,
    retriesAttempted,
    retriesSucceeded,
  };
}

const sliderStyle = {
  width: '100%',
  accentColor: 'var(--accent-primary)',
  cursor: 'pointer',
};

const labelStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 6,
} as React.CSSProperties;

export default function SimulationPage() {
  const [params, setParams] = useState<SimParams>(DEFAULTS);
  const [result, setResult] = useState<SimResult | null>(() => runSimulation(DEFAULTS));
  const [baseline] = useState<SimResult>(() => runSimulation(DEFAULTS));
  const [activePreset, setActivePreset] = useState<string>('baseline');

  const update = useCallback(<K extends keyof SimParams>(key: K, value: SimParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
    setActivePreset('');
  }, []);

  function applyPreset(preset: Preset) {
    const next = { ...DEFAULTS, ...preset.overrides };
    setParams(next);
    setResult(runSimulation(next));
    setActivePreset(preset.id);
  }

  function runSim() {
    setResult(runSimulation(params));
  }

  function resetSim() {
    setParams(DEFAULTS);
    setResult(runSimulation(DEFAULTS));
    setActivePreset('baseline');
  }

  const improvement = result && baseline
    ? ((baseline.failureRate - result.failureRate) / baseline.failureRate) * 100
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">

      {/* Header */}
      <div className="glass" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-primary)',
          }}>
            <Activity size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Failure Rate Simulator
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Adjust parameters and model the impact on your payment failure rate
            </p>
          </div>
        </div>

        {/* Craftgate Preset Quick-Load buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
            <Zap size={13} color="var(--accent-warning)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Presets
            </span>
          </div>
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              title={preset.description}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: activePreset === preset.id
                  ? '1.5px solid var(--accent-primary)'
                  : '1px solid var(--border-subtle)',
                background: activePreset === preset.id
                  ? 'rgba(99,102,241,0.12)'
                  : 'var(--bg-tertiary)',
                color: activePreset === preset.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span>{preset.emoji}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Controls ── */}
        <div className="glass" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Sliders size={15} color="var(--accent-primary)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Parameters</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Transaction volume */}
            <div>
              <div style={labelStyle}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Monthly Transactions</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 700 }}>
                  {params.totalTransactions.toLocaleString()}
                </span>
              </div>
              <input type="range" min={1000} max={100000} step={500}
                value={params.totalTransactions}
                onChange={e => update('totalTransactions', parseInt(e.target.value))}
                style={sliderStyle}
              />
            </div>

            {/* Base failure rate */}
            <div>
              <div style={labelStyle}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Base Failure Rate</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--accent-danger)', fontWeight: 700 }}>
                  {formatPercent(params.baseFailureRate * 100)}
                </span>
              </div>
              <input type="range" min={0.05} max={0.60} step={0.01}
                value={params.baseFailureRate}
                onChange={e => update('baseFailureRate', parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </div>

            {/* Avg amount */}
            <div>
              <div style={labelStyle}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Avg Transaction Amount</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700 }}>
                  ${params.avgTransactionAmount}
                </span>
              </div>
              <input type="range" min={10} max={2000} step={10}
                value={params.avgTransactionAmount}
                onChange={e => update('avgTransactionAmount', parseInt(e.target.value))}
                style={sliderStyle}
              />
            </div>

            {/* Mobile share */}
            <div>
              <div style={labelStyle}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Mobile Traffic Share</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--accent-warning)', fontWeight: 700 }}>
                  {formatPercent(params.mobileShare * 100, 0)}
                </span>
              </div>
              <input type="range" min={0.1} max={0.95} step={0.05}
                value={params.mobileShare}
                onChange={e => update('mobileShare', parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </div>

            {/* Network reliability */}
            <div>
              <div style={labelStyle}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Network Reliability</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--accent-success)', fontWeight: 700 }}>
                  {formatPercent(params.networkReliability * 100, 0)}
                </span>
              </div>
              <input type="range" min={0.5} max={0.99} step={0.01}
                value={params.networkReliability}
                onChange={e => update('networkReliability', parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </div>

            {/* Fraud threshold */}
            <div>
              <div style={labelStyle}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Fraud Detection Sensitivity</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--chart-3)', fontWeight: 700 }}>
                  {formatPercent(params.fraudThreshold * 100, 0)}
                </span>
              </div>
              <input type="range" min={0.05} max={0.40} step={0.01}
                value={params.fraudThreshold}
                onChange={e => update('fraudThreshold', parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </div>

            {/* Retry toggle */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: 8, background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Retry Logic Enabled</span>
              <div
                onClick={() => update('retryEnabled', !params.retryEnabled)}
                style={{
                  width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
                  background: params.retryEnabled ? 'var(--accent-primary)' : 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, borderRadius: '50%',
                  width: 16, height: 16, background: 'white',
                  left: params.retryEnabled ? 20 : 2,
                  transition: 'left 0.2s',
                }} />
              </div>
            </div>

            {params.retryEnabled && (
              <div>
                <div style={labelStyle}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Retry Success Rate</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--accent-success)', fontWeight: 700 }}>
                    {formatPercent(params.retrySuccessRate * 100, 0)}
                  </span>
                </div>
                <input type="range" min={0.05} max={0.70} step={0.05}
                  value={params.retrySuccessRate}
                  onChange={e => update('retrySuccessRate', parseFloat(e.target.value))}
                  style={sliderStyle}
                />
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={runSim} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'white', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Play size={13} /> Run Simulation
              </button>
              <button onClick={resetSim} style={{
                padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                {
                  label: 'Simulated Failure Rate',
                  value: formatPercent(result.failureRate * 100),
                  color: result.failureRate > 0.25 ? 'var(--accent-danger)' : 'var(--accent-success)',
                  icon: <TrendingDown size={14} />,
                  sub: improvement !== 0
                    ? `${improvement > 0 ? '↓' : '↑'} ${Math.abs(improvement).toFixed(1)}% vs baseline`
                    : 'Same as baseline',
                },
                {
                  label: 'Revenue Lost',
                  value: formatCurrency(result.revenueLost),
                  color: 'var(--accent-warning)',
                  icon: <DollarSign size={14} />,
                  sub: `of ${formatCurrency(result.revenueTotal)} total`,
                },
                {
                  label: 'Revenue Recovered',
                  value: formatCurrency(result.revenueRecovered),
                  color: 'var(--accent-success)',
                  icon: <Activity size={14} />,
                  sub: result.retriesAttempted > 0
                    ? `${result.retriesSucceeded} / ${result.retriesAttempted} retries`
                    : 'Retry disabled',
                },
              ].map(({ label, value, color, icon, sub }) => (
                <div key={label} className="glass" style={{ padding: '18px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      {label}
                    </span>
                    <span style={{ color }}>{icon}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 4 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Failure reason breakdown */}
            <div className="glass" style={{ padding: '20px 24px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>
                Simulated Failure Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(Object.entries(result.byReason) as [FailureReason, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => {
                    const color = FAILURE_REASON_COLORS[reason];
                    const pct = result.failedTransactions > 0
                      ? (count / result.totalTransactions) * 100
                      : 0;
                    return (
                      <div key={reason}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {FAILURE_REASON_LABELS[reason]}
                          </span>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {count.toLocaleString()} txns
                            </span>
                            <span className="mono" style={{ fontSize: 12, color, fontWeight: 700, minWidth: 44, textAlign: 'right' }}>
                              {formatPercent(pct)}
                            </span>
                          </div>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${Math.min(pct * 3, 100)}%`,
                            background: color,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>

            {/* Comparison table */}
            <div className="glass" style={{ padding: '20px 24px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                Scenario Comparison
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Metric', 'Baseline', 'Simulated', 'Δ'].map(h => (
                      <th key={h} style={{
                        padding: '6px 10px', textAlign: h === 'Metric' ? 'left' : 'right',
                        color: 'var(--text-muted)', fontWeight: 600, fontSize: 11,
                        textTransform: 'uppercase', letterSpacing: '0.4px',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: 'Failure Rate',
                      base: formatPercent(baseline.failureRate * 100),
                      sim:  formatPercent(result.failureRate * 100),
                      delta: result.failureRate - baseline.failureRate,
                      fmt: (d: number) => `${d > 0 ? '+' : ''}${formatPercent(d * 100)}`,
                      goodIfNegative: true,
                    },
                    {
                      label: 'Revenue Lost',
                      base: formatCurrency(baseline.revenueLost),
                      sim:  formatCurrency(result.revenueLost),
                      delta: result.revenueLost - baseline.revenueLost,
                      fmt: (d: number) => `${d > 0 ? '+' : ''}${formatCurrency(Math.abs(d))}`,
                      goodIfNegative: true,
                    },
                    {
                      label: 'Failed Transactions',
                      base: baseline.failedTransactions.toLocaleString(),
                      sim:  result.failedTransactions.toLocaleString(),
                      delta: result.failedTransactions - baseline.failedTransactions,
                      fmt: (d: number) => `${d > 0 ? '+' : ''}${d.toLocaleString()}`,
                      goodIfNegative: true,
                    },
                  ].map(({ label, base, sim, delta, fmt, goodIfNegative }) => {
                    const isGood = goodIfNegative ? delta < 0 : delta > 0;
                    const color = delta === 0 ? 'var(--text-muted)' : isGood ? 'var(--accent-success)' : 'var(--accent-danger)';
                    return (
                      <tr key={label} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{label}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{base}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{sim}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                          {delta !== 0 ? fmt(delta) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

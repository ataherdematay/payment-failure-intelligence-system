'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, DeviceType, PaymentMethod, FailureReason } from '@/lib/api';
import { FAILURE_REASON_LABELS, FAILURE_REASON_COLORS, formatPercent } from '@/lib/utils';
import { ChartCard } from '@/components/ui/ChartCard';
import { ConfusionMatrixChart } from '@/components/charts/ConfusionMatrixChart';
import {
  Brain, Zap, Target, BarChart2, CheckCircle,
  AlertTriangle, Loader,
} from 'lucide-react';

const DEVICES: DeviceType[]      = ['mobile', 'desktop', 'tablet'];
const METHODS: PaymentMethod[]   = ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'];
const COUNTRIES                  = ['TR', 'US', 'DE', 'GB', 'BR', 'IN'];
const METHOD_LABELS: Record<PaymentMethod, string> = {
  credit_card:    'Credit Card',
  debit_card:     'Debit Card',
  bank_transfer:  'Bank Transfer',
  digital_wallet: 'Digital Wallet',
};

const inputStyle = {
  width: '100%',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 13,
  padding: '10px 12px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

export default function PredictionsPage() {
  const now = new Date();

  const [form, setForm] = useState({
    amount:        250,
    device:        'mobile' as DeviceType,
    country:       'TR',
    payment_method:'credit_card' as PaymentMethod,
    hour_of_day:   now.getHours(),
    day_of_week:   now.getDay(),
  });

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['ml-metrics'],
    queryFn: () => api.getModelMetrics(),
    staleTime: 120_000,
    retry: 1,
  });

  const { data: mlHealth } = useQuery({
    queryKey: ['ml-health'],
    queryFn: () => api.getMLHealth(),
    refetchInterval: 15_000,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => api.predict(form),
  });

  const result = mutation.data;

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  const isMLOnline = mlHealth?.status === 'ok' || mlHealth?.status === 'healthy';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">

      {/* ML Status banner */}
      <div className="glass" style={{
        padding: '12px 20px',
        borderLeft: `3px solid ${isMLOnline ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isMLOnline ? 'var(--accent-success)' : 'var(--accent-danger)',
          ...(isMLOnline ? { animation: 'pulse 2s infinite' } : {}),
        }} className={isMLOnline ? 'pulse-dot' : ''} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          ML Service — <strong style={{ color: isMLOnline ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            {isMLOnline ? 'Online' : 'Offline'}
          </strong>
          {!isMLOnline && ' · Start with: cd ml-service && uvicorn app.main:app --port 8000'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>

        {/* ── Prediction Form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Brain size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Failure Reason Predictor
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Amount */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
                  Amount (USD)
                </label>
                <input
                  type="number" min={1} max={10000}
                  value={form.amount}
                  onChange={e => setField('amount', parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>

              {/* Device */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
                  Device
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {DEVICES.map(d => (
                    <button key={d}
                      onClick={() => setField('device', d)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                        border: form.device === d ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        background: form.device === d ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)',
                        color: form.device === d ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: form.device === d ? 600 : 400,
                        transition: 'all 0.15s',
                        textTransform: 'capitalize',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
                  Country
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COUNTRIES.map(c => (
                    <button key={c}
                      onClick={() => setField('country', c)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                        border: form.country === c ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        background: form.country === c ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)',
                        color: form.country === c ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: form.country === c ? 700 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
                  Payment Method
                </label>
                <select
                  value={form.payment_method}
                  onChange={e => setField('payment_method', e.target.value as PaymentMethod)}
                  style={inputStyle}
                >
                  {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </select>
              </div>

              {/* Hour + Day */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
                    Hour (0–23)
                  </label>
                  <input type="number" min={0} max={23}
                    value={form.hour_of_day}
                    onChange={e => setField('hour_of_day', parseInt(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
                    Day (0=Mon)
                  </label>
                  <input type="number" min={0} max={6}
                    value={form.day_of_week}
                    onChange={e => setField('day_of_week', parseInt(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Predict button */}
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !isMLOnline}
                style={{
                  padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  cursor: mutation.isPending || !isMLOnline ? 'not-allowed' : 'pointer',
                  border: 'none',
                  background: mutation.isPending || !isMLOnline
                    ? 'var(--bg-tertiary)'
                    : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  color: mutation.isPending || !isMLOnline ? 'var(--text-muted)' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                  opacity: !isMLOnline ? 0.5 : 1,
                }}
              >
                {mutation.isPending
                  ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Predicting...</>
                  : <><Zap size={15} /> Predict Failure Reason</>
                }
              </button>
            </div>
          </div>

          {/* Result card */}
          {result && (
            <div className="glass fade-in" style={{
              padding: '20px 24px',
              borderLeft: `3px solid ${FAILURE_REASON_COLORS[result.prediction] || 'var(--accent-primary)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Target size={16} color={FAILURE_REASON_COLORS[result.prediction]} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Prediction Result
                </span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="mono" style={{
                  fontSize: 22, fontWeight: 700,
                  color: FAILURE_REASON_COLORS[result.prediction] || 'var(--accent-primary)',
                  marginBottom: 4,
                }}>
                  {FAILURE_REASON_LABELS[result.prediction]}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Confidence: <strong className="mono" style={{ color: 'var(--text-primary)' }}>
                    {formatPercent(result.confidence * 100)}
                  </strong>
                </div>
              </div>

              {/* Probability bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(result.probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, prob]) => {
                    const r = reason as FailureReason;
                    const color = FAILURE_REASON_COLORS[r] || 'var(--accent-primary)';
                    return (
                      <div key={r}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {FAILURE_REASON_LABELS[r]}
                          </span>
                          <span className="mono" style={{ fontSize: 11, color, fontWeight: 600 }}>
                            {formatPercent(prob * 100)}
                          </span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${prob * 100}%`,
                            background: color,
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {mutation.isError && (
            <div className="glass" style={{ padding: 16, borderLeft: '3px solid var(--accent-danger)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={14} color="var(--accent-danger)" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  ML service unreachable. Make sure FastAPI is running on port 8000.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Model Metrics ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Key metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Accuracy',  value: metrics?.accuracy,          color: 'var(--accent-success)' },
              { label: 'Precision', value: metrics?.precision_weighted, color: 'var(--accent-primary)' },
              { label: 'Recall',    value: metrics?.recall_weighted,    color: 'var(--accent-secondary)' },
              { label: 'F1 Score',  value: metrics?.f1_weighted,        color: 'var(--accent-warning)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass" style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                  {label}
                </div>
                {loadingMetrics
                  ? <div className="skeleton" style={{ height: 28, width: '60%' }} />
                  : <div className="mono" style={{ fontSize: 24, fontWeight: 700, color }}>
                      {value != null ? formatPercent(value * 100) : '—'}
                    </div>
                }
              </div>
            ))}
          </div>

          {/* Training info */}
          {metrics && (
            <div className="glass" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
                Training Info
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Training Samples', value: metrics.training_samples?.toLocaleString() },
                  { label: 'Test Samples',     value: metrics.test_samples?.toLocaleString() },
                  { label: 'Trained At',       value: metrics.trained_at ? new Date(metrics.trained_at).toLocaleString() : '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-class metrics */}
          {metrics?.per_class && (
            <ChartCard title="Per-Class F1 Scores" subtitle="Model performance by failure category" height={220}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
                {Object.entries(metrics.per_class).map(([reason, scores]) => {
                  const r = reason as FailureReason;
                  const color = FAILURE_REASON_COLORS[r] || 'var(--accent-primary)';
                  return (
                    <div key={r}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {FAILURE_REASON_LABELS[r]}
                        </span>
                        <span className="mono" style={{ fontSize: 11, color, fontWeight: 700 }}>
                          F1: {formatPercent(scores.f1 * 100)}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${scores.f1 * 100}%`,
                          background: color,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          )}

          {(!metrics && !loadingMetrics) && (
            <div className="glass" style={{ padding: 24, textAlign: 'center' }}>
              <CheckCircle size={28} color="var(--text-muted)" style={{ marginBottom: 8 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Start the ML service to see model metrics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

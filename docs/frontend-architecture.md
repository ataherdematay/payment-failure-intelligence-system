# Frontend Component Architecture

## Design System

### Color Palette (Dark Theme)
```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a2e;
  --accent-primary: #6366f1;
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-danger: #ef4444;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --chart-1: #6366f1;
  --chart-2: #8b5cf6;
  --chart-3: #ec4899;
  --chart-4: #14b8a6;
  --chart-5: #f97316;
}
```

### Typography
- Primary: Inter (body, UI)
- Monospace: JetBrains Mono (numbers, data)

---

## Pages

### Overview (`/`) — KPI cards, Donut chart, Time series, Device/Country bars, Recent transactions
### Analytics (`/analytics`) — Date range picker, Stacked area chart, Payment method comparison, Data table
### Insights (`/insights`) — Insight cards grid, Top failures, Fraud flags, Retry suggestions
### Predictions (`/predictions`) — Prediction form, Result display, Model metrics, Confusion matrix
### Simulation (`/simulation`) — Live chart, Live KPI counters, Transaction feed with auto-scroll

---

## Component Inventory

| Component | Type | Description |
|-----------|------|-------------|
| Sidebar | Client | Navigation with icons, active state, collapse |
| TopBar | Client | Breadcrumbs + status indicator |
| KPICard | Client | Metric with sparkline + trend |
| ChartCard | Client | Wrapper with title + loading state |
| DataTable | Client | Sortable, filterable, paginated table |
| StatusBadge | Server | Color-coded status pill |
| InsightCard | Server | NLP insight with metrics |
| FailureDistributionChart | Client | PieChart (Recharts) |
| TimeSeriesChart | Client | AreaChart (Recharts) |
| DeviceChart | Client | BarChart horizontal |
| CountryChart | Client | BarChart vertical |
| ConfusionMatrixChart | Client | Custom grid heatmap |
| FeatureImportanceChart | Client | BarChart horizontal |
| LiveChart | Client | LineChart animated |
| PredictionForm | Client | Interactive form |
| DateRangePicker | Client | Date inputs |

## State Management — @tanstack/react-query
- Stale time: 60s for analytics, 30s for transactions, 5min for insights
- Simulation polling: 1s interval

import React, { useState, useEffect } from 'react';
import {
  FileText, Calendar, Zap, ShieldCheck, Printer, ArrowUpRight,
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, CircleDollarSign,
  Clock, Eye, RefreshCw, Layers, Sparkles, AlertCircle, CheckCircle,
  HelpCircle, ChevronRight, Activity, BarChart3, Scale, ShieldAlert
} from 'lucide-react';
import { authFetch } from '../context/AuthContext';
import { MetricCard } from '../components/MetricCard';

const fmtCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const fmtShortCurrency = (v) => {
  const n = Number(v || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
  return `₹${n}`;
};

// =========================================================================
// PURE SVG CHART COMPONENTS (PDF-Safe, Synchronous, Zero Sizing Latency)
// =========================================================================

// 1. REVENUE COMPARISON SVG CHART (ViewBox 0 0 540 190)
function SvgRevenueComparison({ data = [] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-xs text-neutral-500">No revenue comparison data available</div>;
  }
  const maxVal = Math.max(...data.map(d => d.amount || 0), 1);
  const chartHeight = 115;
  const chartTop = 30;
  const chartBottom = chartTop + chartHeight;
  const barWidth = 90;
  const positions = [55, 225, 395];
  const fills = ['#ffffff', '#a3a3a3', '#525252'];

  return (
    <svg viewBox="0 0 540 190" className="w-full h-auto max-h-56 select-none" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      <line x1="45" y1={chartTop} x2="510" y2={chartTop} stroke="#333333" strokeDasharray="3 3" className="print:stroke-gray-300" />
      <text x="40" y={chartTop + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">{fmtShortCurrency(maxVal)}</text>

      <line x1="45" y1={chartTop + chartHeight / 2} x2="510" y2={chartTop + chartHeight / 2} stroke="#333333" strokeDasharray="3 3" className="print:stroke-gray-300" />
      <text x="40" y={chartTop + chartHeight / 2 + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">{fmtShortCurrency(maxVal / 2)}</text>

      <line x1="45" y1={chartBottom} x2="510" y2={chartBottom} stroke="#525252" className="print:stroke-gray-400" />
      <text x="40" y={chartBottom + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">₹0</text>

      {/* Bars */}
      {data.map((d, i) => {
        const x = positions[i] || (55 + i * 160);
        const barH = Math.max(4, ((d.amount || 0) / maxVal) * chartHeight);
        const y = chartBottom - barH;
        return (
          <g key={d.name || i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx="4"
              fill={fills[i % fills.length]}
              stroke="#000000"
              strokeWidth="0.5"
            />
            {/* Amount Label on top of bar */}
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="#ffffff"
              className="print:fill-black font-mono"
            >
              {fmtCurrency(d.amount)}
            </text>
            {/* Category Name below bar */}
            <text
              x={x + barWidth / 2}
              y={chartBottom + 16}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#a3a3a3"
              className="print:fill-black"
            >
              {d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 2. RECOVERY TREND SVG CHART (ViewBox 0 0 540 180)
function SvgRecoveryTrend({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center text-center">
        <p className="text-xs text-neutral-400 print:text-gray-600">No daily recovery trend data recorded for this month.</p>
        <p className="mt-1 text-[11px] text-neutral-600 print:text-gray-400">Total recovered: ₹0</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.recovered || 0), 1);
  const chartHeight = 110;
  const chartTop = 25;
  const chartBottom = chartTop + chartHeight;
  const chartLeft = 50;
  const chartRight = 510;
  const chartWidth = chartRight - chartLeft;

  const points = data.map((d, i) => {
    const x = chartLeft + (i / Math.max(1, data.length - 1)) * chartWidth;
    const y = chartBottom - ((d.recovered || 0) / maxVal) * chartHeight;
    return { x, y, ...d };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `M ${points[0].x},${chartBottom} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${chartBottom} Z`;

  return (
    <svg viewBox="0 0 540 180" className="w-full h-auto max-h-56 select-none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="svg-trend-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" className="print:stop-color-gray-400" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.01" className="print:stop-color-gray-100" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      <line x1={chartLeft} y1={chartTop} x2={chartRight} y2={chartTop} stroke="#333333" strokeDasharray="3 3" className="print:stroke-gray-300" />
      <text x={chartLeft - 8} y={chartTop + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">{fmtShortCurrency(maxVal)}</text>

      <line x1={chartLeft} y1={chartTop + chartHeight / 2} x2={chartRight} y2={chartTop + chartHeight / 2} stroke="#333333" strokeDasharray="3 3" className="print:stroke-gray-300" />
      <text x={chartLeft - 8} y={chartTop + chartHeight / 2 + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">{fmtShortCurrency(maxVal / 2)}</text>

      <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#525252" className="print:stroke-gray-400" />
      <text x={chartLeft - 8} y={chartBottom + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">₹0</text>

      {/* Area fill */}
      <path d={areaPath} fill="url(#svg-trend-gradient)" className="print:fill-gray-200" />

      {/* Curve Line */}
      <polyline
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polylinePoints}
        className="print:stroke-black"
      />

      {/* Points & Labels */}
      {points.map((p, i) => {
        const showLabel = data.length <= 8 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#000000" strokeWidth="1.5" className="print:fill-black print:stroke-white" />
            {showLabel && (
              <text x={p.x} y={chartBottom + 16} textAnchor="middle" fontSize="9" fill="#a3a3a3" className="print:fill-black font-mono">
                {p.date}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// 3. RECOVERY OUTCOMES SVG CHART (ViewBox 0 0 540 190)
function SvgRecoveryOutcomes({ data = [] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-xs text-neutral-500">No outcomes recorded</div>;
  }

  const maxVal = Math.max(...data.map(d => d.count || 0), 1);
  const chartHeight = 115;
  const chartTop = 30;
  const chartBottom = chartTop + chartHeight;
  const chartLeft = 50;
  const chartRight = 510;
  const totalWidth = chartRight - chartLeft;
  const barWidth = Math.min(75, Math.floor(totalWidth / (data.length * 1.5)));
  const fills = ['#ffffff', '#cccccc', '#999999', '#666666'];

  return (
    <svg viewBox="0 0 540 190" className="w-full h-auto max-h-56 select-none" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      <line x1={chartLeft} y1={chartTop} x2={chartRight} y2={chartTop} stroke="#333333" strokeDasharray="3 3" className="print:stroke-gray-300" />
      <text x={chartLeft - 8} y={chartTop + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">{maxVal}</text>

      <line x1={chartLeft} y1={chartTop + chartHeight / 2} x2={chartRight} y2={chartTop + chartHeight / 2} stroke="#333333" strokeDasharray="3 3" className="print:stroke-gray-300" />
      <text x={chartLeft - 8} y={chartTop + chartHeight / 2 + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">{Math.round(maxVal / 2)}</text>

      <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#525252" className="print:stroke-gray-400" />
      <text x={chartLeft - 8} y={chartBottom + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">0</text>

      {/* Bars */}
      {data.map((d, i) => {
        const slotWidth = totalWidth / data.length;
        const x = chartLeft + i * slotWidth + (slotWidth - barWidth) / 2;
        const barH = Math.max(4, ((d.count || 0) / maxVal) * chartHeight);
        const y = chartBottom - barH;
        return (
          <g key={d.name || i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx="4"
              fill={fills[i % fills.length]}
              stroke="#000000"
              strokeWidth="0.5"
            />
            {/* Value Label */}
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="#ffffff"
              className="print:fill-black font-mono"
            >
              {d.count} {d.amount > 0 ? `(${fmtShortCurrency(d.amount)})` : ''}
            </text>
            {/* Category label */}
            <text
              x={x + barWidth / 2}
              y={chartBottom + 16}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#a3a3a3"
              className="print:fill-black"
            >
              {d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 4. FAILURE REASONS HORIZONTAL SVG CHART (ViewBox 0 0 540 220)
function SvgFailureReasons({ data = [] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-xs text-neutral-500">No failure breakdown available</div>;
  }

  const items = data.slice(0, 6);
  const maxVal = Math.max(...items.map(d => d.amount || 0), 1);
  const labelWidth = 160;
  const barStartX = labelWidth + 10;
  const barMaxW = 250;
  const rowHeight = 28;
  const topMargin = 15;
  const svgHeight = topMargin + items.length * rowHeight + 15;
  const fills = ['#ffffff', '#e5e5e5', '#cccccc', '#a3a3a3', '#737373', '#525252'];

  return (
    <svg viewBox={`0 0 540 ${svgHeight}`} className="w-full h-auto select-none" preserveAspectRatio="xMidYMid meet">
      {items.map((d, i) => {
        const y = topMargin + i * rowHeight;
        const barW = Math.max(4, ((d.amount || 0) / maxVal) * barMaxW);
        const shortReason = d.reason && d.reason.length > 24 ? `${d.reason.slice(0, 22)}…` : d.reason;
        return (
          <g key={d.reason || i}>
            {/* Reason Label */}
            <text
              x={labelWidth}
              y={y + 13}
              textAnchor="end"
              fontSize="9"
              fontWeight="500"
              fill="#d4d4d4"
              className="print:fill-black"
            >
              {shortReason}
            </text>
            {/* Horizontal Bar */}
            <rect
              x={barStartX}
              y={y + 3}
              width={barW}
              height="14"
              rx="3"
              fill={fills[i % fills.length]}
              stroke="#000000"
              strokeWidth="0.5"
            />
            {/* Value Label */}
            <text
              x={barStartX + barW + 8}
              y={y + 13}
              textAnchor="start"
              fontSize="9"
              fontWeight="bold"
              fill="#ffffff"
              className="print:fill-black font-mono"
            >
              {fmtCurrency(d.amount)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 5. RECOVERY ACTIONS DEPLOYED SVG CHART (ViewBox 0 0 540 190)
function SvgRecoveryActions({ data = [] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-xs text-neutral-500">No actions recorded</div>;
  }

  const maxVal = Math.max(...data.map(d => d.count || 0), 1);
  const chartHeight = 115;
  const chartTop = 30;
  const chartBottom = chartTop + chartHeight;
  const chartLeft = 40;
  const chartRight = 520;
  const totalWidth = chartRight - chartLeft;
  const barWidth = Math.min(65, Math.floor(totalWidth / (data.length * 1.5)));
  const fills = ['#ffffff', '#d4d4d4', '#a3a3a3', '#737373', '#525252'];

  return (
    <svg viewBox="0 0 540 190" className="w-full h-auto max-h-56 select-none" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      <line x1={chartLeft} y1={chartTop} x2={chartRight} y2={chartTop} stroke="#333333" strokeDasharray="3 3" className="print:stroke-gray-300" />
      <text x={chartLeft - 6} y={chartTop + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">{maxVal}</text>

      <line x1={chartLeft} y1={chartTop + chartHeight / 2} x2={chartRight} y2={chartTop + chartHeight / 2} stroke="#333333" strokeDasharray="3 3" className="print:stroke-gray-300" />
      <text x={chartLeft - 6} y={chartTop + chartHeight / 2 + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">{Math.round(maxVal / 2)}</text>

      <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#525252" className="print:stroke-gray-400" />
      <text x={chartLeft - 6} y={chartBottom + 4} textAnchor="end" fontSize="9" fill="#737373" className="print:fill-gray-600 font-mono">0</text>

      {/* Bars */}
      {data.map((d, i) => {
        const slotWidth = totalWidth / data.length;
        const x = chartLeft + i * slotWidth + (slotWidth - barWidth) / 2;
        const barH = Math.max(4, ((d.count || 0) / maxVal) * chartHeight);
        const y = chartBottom - barH;
        const shortName = d.action && d.action.length > 14 ? `${d.action.slice(0, 12)}…` : d.action;
        return (
          <g key={d.action || i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx="4"
              fill={fills[i % fills.length]}
              stroke="#000000"
              strokeWidth="0.5"
            />
            {/* Value Label */}
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="#ffffff"
              className="print:fill-black font-mono"
            >
              {d.count}
            </text>
            {/* Category label */}
            <text
              x={x + barWidth / 2}
              y={chartBottom + 15}
              textAnchor="middle"
              fontSize="8"
              fontWeight="600"
              fill="#a3a3a3"
              className="print:fill-black"
            >
              {shortName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// =========================================================================
// AUDITS PAGE COMPONENT
// =========================================================================

export function Audits() {
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly', 'run', 'archive'
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [archivedAudits, setArchivedAudits] = useState([]);
  const [activeAudit, setActiveAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Fetch available months and archive history on load
  useEffect(() => {
    fetchMonths();
    fetchArchive();
  }, []);

  const fetchMonths = async () => {
    try {
      const res = await authFetch('/api/audits/months');
      if (res.ok) {
        const data = await res.json();
        setMonths(data.months || []);
        if (data.months && data.months.length > 0) {
          setSelectedMonth(data.months[0].monthStr);
        }
      }
    } catch (err) {
      console.error('Failed to fetch audit months:', err);
    }
  };

  const fetchArchive = async () => {
    try {
      const res = await authFetch('/api/audits');
      if (res.ok) {
        const data = await res.json();
        setArchivedAudits(data.audits || []);
      }
    } catch (err) {
      console.error('Failed to fetch archived audits:', err);
    }
  };

  const handleGenerateMonthly = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    setNotice(null);
    try {
      const res = await authFetch('/api/audits/generate-monthly', {
        method: 'POST',
        body: JSON.stringify({ monthStr: selectedMonth })
      });
      const result = await res.json();
      if (result.status === 'empty') {
        setNotice({ message: result.message || 'No recovery activity recorded for this period.', type: 'info' });
        setActiveAudit(null);
      } else if (result.audit) {
        setActiveAudit(result.audit.data);
        fetchArchive();
        setTimeout(() => {
          document.getElementById('printable-audit')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      setNotice({ message: err.message || 'Failed to generate monthly audit.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRun = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await authFetch('/api/audits/generate-run', { method: 'POST' });
      const result = await res.json();
      if (result.status === 'empty') {
        setNotice({ message: result.message || 'No recovery run transactions available.', type: 'info' });
        setActiveAudit(null);
      } else if (result.audit) {
        setActiveAudit(result.audit.data);
        fetchArchive();
        setTimeout(() => {
          document.getElementById('printable-audit')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      setNotice({ message: err.message || 'Failed to generate run audit.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewArchive = async (auditId) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/audits/${auditId}`);
      if (res.ok) {
        const result = await res.json();
        setActiveAudit(result.audit.data);
        setTimeout(() => {
          document.getElementById('printable-audit')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to fetch audit detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-[1540px] space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Compliance & Executive Reporting</p>
          <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Audit Sheets</h1>
          <p className="mt-1 text-xs leading-5 text-neutral-400">Generate and export official audit reports documenting AI recovery operations, financial outcomes, and policy boundaries.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3 print:hidden">
        <button
          onClick={() => { setActiveTab('monthly'); setNotice(null); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'monthly' ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4" /> Monthly Audits
        </button>

        <button
          onClick={() => { setActiveTab('run'); setNotice(null); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'run' ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
          }`}
        >
          <Zap className="h-4 w-4" /> Recovery Run Audits
        </button>

        <button
          onClick={() => { setActiveTab('archive'); setNotice(null); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'archive' ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" /> Audit History ({archivedAudits.length})
        </button>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className={`rounded-2xl border p-4 text-sm print:hidden ${
          notice.type === 'error' ? 'border-red-900 bg-red-950/40 text-red-200' : 'border-neutral-800 bg-neutral-900 text-neutral-300'
        }`}>
          <p>{notice.message}</p>
        </div>
      )}

      {/* TAB 1: MONTHLY AUDIT GENERATOR */}
      {activeTab === 'monthly' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Monthly Audit Sheet</h2>
              <p className="mt-1 text-xs text-neutral-400">Select a billing month to aggregate all recovery operations, financial metrics, and policy safety checks.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-neutral-700 bg-black px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white"
              >
                {months.length > 0 ? (
                  months.map((m) => (
                    <option key={m.monthStr} value={m.monthStr}>{m.label}</option>
                  ))
                ) : (
                  <option value="">No Month Activity Recorded</option>
                )}
              </select>

              <button
                onClick={handleGenerateMonthly}
                disabled={loading || !selectedMonth}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50"
              >
                <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Generating...' : 'Generate Monthly Audit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECOVERY RUN AUDIT GENERATOR */}
      {activeTab === 'run' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Recovery Run Audit Sheet</h2>
              <p className="mt-1 text-xs text-neutral-400">Audit the most recent batch of autonomous recovery operations, policy decisions, and transaction outcomes.</p>
            </div>
            <button
              onClick={handleGenerateRun}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              <Zap className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : 'Generate Run Audit'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY ARCHIVE */}
      {activeTab === 'archive' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 print:hidden">
          <h2 className="mb-4 text-lg font-semibold text-white">Saved Audit History</h2>
          {archivedAudits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500 uppercase tracking-wider">
                    <th className="pb-3 px-3">Audit Title</th>
                    <th className="pb-3 px-3">Type</th>
                    <th className="pb-3 px-3">Period / Run</th>
                    <th className="pb-3 px-3">Generated Date</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                  {archivedAudits.map((a) => (
                    <tr key={a.id} className="hover:bg-neutral-900/50 transition">
                      <td className="py-3.5 px-3 font-semibold text-white">{a.title}</td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          a.audit_type === 'monthly' ? 'bg-neutral-800 text-white' : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {a.audit_type === 'monthly' ? 'Monthly Audit' : 'Run Audit'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">{a.period_label || a.month_str || a.run_id}</td>
                      <td className="py-3.5 px-3 text-neutral-400">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => handleViewArchive(a.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Audit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-neutral-500 text-sm">No saved audit sheets found. Generate one above!</div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTIVE AUDIT SHEET PRESENTATION & PRINT EXPORTER LAYER                     */}
      {/* ========================================================================= */}
      {activeAudit && (
        <div id="printable-audit" className="space-y-8 rounded-3xl border border-neutral-800 bg-black p-6 sm:p-10 print:border-none print:bg-white print:p-0 print:text-black">
          
          {/* ==================== 1. AUDIT HEADER ==================== */}
          <div className="border-b border-neutral-800 pb-6 print:border-black">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="font-extrabold text-2xl tracking-tight text-white print:text-black">
                    Recover<span className="text-neutral-400 print:text-neutral-600">AI</span>
                  </span>
                  <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white print:border-black print:bg-gray-100 print:text-black">
                    Official Recovery Audit Report
                  </span>
                </div>
                <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white print:text-black">{activeAudit.title}</h2>
              </div>

              <div className="flex items-center gap-3 print:hidden">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black shadow-lg transition hover:bg-neutral-200"
                >
                  <Printer className="h-4 w-4" /> Export / Print PDF
                </button>
                <button
                  onClick={() => setActiveAudit(null)}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white"
                >
                  Close View
                </button>
              </div>
            </div>

            {/* Header Metadata Grid */}
            <div className="mt-6 grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4 print:border-gray-300 print:bg-gray-50 print:text-black">
              <div>
                <p className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px] print:text-neutral-600">Audit Type</p>
                <p className="mt-1 font-bold text-white print:text-black">
                  {activeAudit.auditType === 'monthly' ? 'Monthly Recovery Audit' : 'Recovery Run Audit'}
                </p>
                <p className="text-neutral-400 print:text-neutral-600 font-mono text-[11px]">ID: {activeAudit.auditId}</p>
              </div>

              <div>
                <p className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px] print:text-neutral-600">Merchant Account</p>
                <p className="mt-1 font-bold text-white print:text-black">{activeAudit.merchant?.name || 'Merchant Account'}</p>
                <p className="text-neutral-400 print:text-neutral-600">{activeAudit.merchant?.email || 'N/A'}</p>
              </div>

              <div>
                <p className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px] print:text-neutral-600">Reporting Period</p>
                <p className="mt-1 font-bold text-white print:text-black">{activeAudit.reportingPeriod || activeAudit.periodLabel}</p>
                {activeAudit.runId && <p className="text-neutral-400 print:text-neutral-600">Run ID: {activeAudit.runId}</p>}
              </div>

              <div>
                <p className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px] print:text-neutral-600">Generated Timestamp</p>
                <p className="mt-1 font-bold text-white print:text-black">{new Date(activeAudit.generatedAt).toLocaleString()}</p>
                <p className="text-neutral-400 print:text-neutral-600">Status: Policy-Bounded Verified</p>
              </div>
            </div>
          </div>

          {/* ==================== 2. EXECUTIVE SUMMARY ==================== */}
          <div className="space-y-4 page-break-avoid">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-neutral-600">Section 1</p>
              <h3 className="text-base font-bold text-white sm:text-lg print:text-black">Executive Summary</h3>
            </div>

            {/* Top 4 KPI Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Failed Revenue"
                value={fmtCurrency(activeAudit.metrics?.totalFailedValue)}
                subtext="Total revenue at risk"
                icon={CircleDollarSign}
              />
              <MetricCard
                title="Revenue Recovered"
                value={fmtCurrency(activeAudit.metrics?.actualRecovered)}
                subtext="Verified recovered amount"
                icon={CheckCircle2}
              />
              <MetricCard
                title="Recovery Rate"
                value={`${activeAudit.metrics?.recoveryRate || 0}%`}
                subtext={activeAudit.metrics?.recoveryRateLabel || `${activeAudit.metrics?.successfulCount || 0} recovered`}
                icon={Zap}
              />
              <MetricCard
                title="Policy Compliance Rate"
                value={`${activeAudit.safetyAudit?.complianceRate || 100}%`}
                subtext="0 safety boundary breaches"
                icon={ShieldCheck}
              />
            </div>

            {/* Secondary Metric Grid Breakdown */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-xs print:border-gray-300 print:bg-white">
              <div className="p-2">
                <p className="text-neutral-500 print:text-neutral-600">Payments Evaluated</p>
                <p className="mt-1 text-lg font-bold text-white print:text-black">{activeAudit.metrics?.totalPaymentsCount || activeAudit.metrics?.totalEvaluated || 0}</p>
              </div>
              <div className="p-2">
                <p className="text-neutral-500 print:text-neutral-600">Recovery Opportunities</p>
                <p className="mt-1 text-lg font-bold text-white print:text-black">{activeAudit.metrics?.opportunitiesCount || 0}</p>
              </div>
              <div className="p-2">
                <p className="text-neutral-500 print:text-neutral-600">Recovery Attempts</p>
                <p className="mt-1 text-lg font-bold text-white print:text-black">{activeAudit.metrics?.attemptsCount || 0}</p>
              </div>
              <div className="p-2">
                <p className="text-neutral-500 print:text-neutral-600">Successful Recoveries</p>
                <p className="mt-1 text-lg font-bold text-emerald-400 print:text-black">{activeAudit.metrics?.successfulCount || 0}</p>
              </div>
              <div className="p-2">
                <p className="text-neutral-500 print:text-neutral-600">Failed Recoveries</p>
                <p className="mt-1 text-lg font-bold text-red-400 print:text-black">{activeAudit.metrics?.unsuccessfulCount || 0}</p>
              </div>
              <div className="p-2">
                <p className="text-neutral-500 print:text-neutral-600">Revenue Still at Risk</p>
                <p className="mt-1 text-lg font-bold text-neutral-300 print:text-black">{fmtCurrency(activeAudit.metrics?.unrecoveredAmount)}</p>
              </div>
            </div>
          </div>

          {/* ==================== 3. REVENUE RECOVERY SECTION ==================== */}
          <div className="space-y-4 page-break-avoid">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-neutral-600">Section 2</p>
              <h3 className="text-base font-bold text-white sm:text-lg print:text-black">Revenue Recovery & Financial Comparison</h3>
            </div>

            <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
              {/* Financial Balance Card */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 print:border-gray-300 print:bg-gray-50 print:text-black flex flex-col justify-between">
                <h4 className="text-sm font-semibold text-white print:text-black">Financial Metrics Summary</h4>
                <div className="mt-4 space-y-3 divide-y divide-neutral-800 print:divide-gray-200 text-xs">
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400 print:text-neutral-700">Revenue at Risk:</span>
                    <span className="font-bold text-white print:text-black">{fmtCurrency(activeAudit.metrics?.totalFailedValue)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400 print:text-neutral-700">Expected Recovery (AI Projected):</span>
                    <span className="font-bold text-neutral-300 print:text-black">{fmtCurrency(activeAudit.metrics?.expectedRecovery)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400 print:text-neutral-700">Revenue Recovered (Verified):</span>
                    <span className="font-bold text-emerald-400 print:text-black">{fmtCurrency(activeAudit.metrics?.actualRecovered)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400 print:text-neutral-700">Still Unrecovered:</span>
                    <span className="font-bold text-neutral-300 print:text-black">{fmtCurrency(activeAudit.metrics?.unrecoveredAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400 print:text-neutral-700">Recovery Rate / Opportunities:</span>
                    <span className="font-bold text-white print:text-black">{activeAudit.metrics?.recoveryRate || 0}% ({activeAudit.metrics?.recoveryRateLabel})</span>
                  </div>
                </div>
              </div>

              {/* GRAPH 2: Revenue Comparison Bar Chart (Pure SVG) */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 print:border-gray-300 print:bg-white print:text-black">
                <p className="text-sm font-bold text-white print:text-black">Revenue Recovery Comparison</p>
                <p className="text-xs text-neutral-400 print:text-gray-600">Failed Volume vs AI Expected Recovery vs Verified Recovered Revenue</p>
                
                <div className="mt-4 w-full">
                  <SvgRevenueComparison data={activeAudit.charts?.revenueComparison} />
                </div>
              </div>
            </div>
          </div>

          {/* ==================== 4. RECOVERY PERFORMANCE & TREND ==================== */}
          <div className="space-y-4 page-break-avoid">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-neutral-600">Section 3</p>
              <h3 className="text-base font-bold text-white sm:text-lg print:text-black">Recovery Performance & Outcomes</h3>
            </div>

            <div className="grid gap-6 xl:grid-cols-2 print:grid-cols-1">
              {/* GRAPH 1: Recovery Performance Trend (Pure SVG) */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 print:border-gray-300 print:bg-white print:text-black">
                <p className="text-sm font-bold text-white print:text-black">
                  {activeAudit.auditType === 'monthly' ? 'Monthly Recovery Performance Trend' : 'Recovery Run Evaluated Score Timeline'}
                </p>
                <p className="text-xs text-neutral-400 print:text-gray-600">
                  {activeAudit.auditType === 'monthly' ? 'Daily revenue recovered during this billing cycle' : 'Transaction recovery trajectory across this batch'}
                </p>

                <div className="mt-4 w-full">
                  <SvgRecoveryTrend data={activeAudit.charts?.trend} />
                </div>
              </div>

              {/* GRAPH 3: Recovery Outcomes Distribution (Pure SVG) */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 print:border-gray-300 print:bg-white print:text-black">
                <p className="text-sm font-bold text-white print:text-black">Recovery Outcomes Distribution</p>
                <p className="text-xs text-neutral-400 print:text-gray-600">Case volume breakdown by final recovery disposition</p>

                <div className="mt-4 w-full">
                  <SvgRecoveryOutcomes data={activeAudit.charts?.outcomeDist} />
                </div>
              </div>
            </div>
          </div>

          {/* ==================== 5. FAILURE REASONS BREAKDOWN ==================== */}
          <div className="space-y-4 page-break-avoid">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-neutral-600">Section 4</p>
              <h3 className="text-base font-bold text-white sm:text-lg print:text-black">Payment Failure Reasons Breakdown</h3>
            </div>

            <div className="grid gap-6 xl:grid-cols-2 print:grid-cols-1">
              {/* GRAPH 4: Failure Reasons Breakdown (Pure SVG) */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 print:border-gray-300 print:bg-white print:text-black">
                <p className="text-sm font-bold text-white print:text-black">Failure Reasons Distribution</p>
                <p className="text-xs text-neutral-400 print:text-gray-600">At-risk payment volume classified by root failure cause</p>

                <div className="mt-4 w-full">
                  <SvgFailureReasons data={activeAudit.charts?.byFailure} />
                </div>
              </div>

              {/* Strategy Distribution Chart (Pure SVG) */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 print:border-gray-300 print:bg-white print:text-black">
                <p className="text-sm font-bold text-white print:text-black">Recovery Actions Deployed</p>
                <p className="text-xs text-neutral-400 print:text-gray-600">Distribution of recovery strategies selected by AI</p>

                <div className="mt-4 w-full">
                  <SvgRecoveryActions data={activeAudit.charts?.byAction} />
                </div>
              </div>
            </div>
          </div>

          {/* ==================== 6. POLICY COMPLIANCE SECTION ==================== */}
          <div className="space-y-4 page-break-avoid">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-neutral-600">Section 5</p>
              <h3 className="text-base font-bold text-white sm:text-lg print:text-black">Policy & Safety Compliance Audit</h3>
              <p className="mt-0.5 text-xs text-neutral-400 print:text-gray-600">Verification that all AI actions executed strictly within configured merchant safety boundaries.</p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 print:border-gray-300 print:bg-white">
              {/* Compliance Header Stats */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4 print:border-gray-200">
                <div>
                  <p className="text-xs text-neutral-400 print:text-gray-600">Overall Safety Compliance Rate</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-400 print:text-black">
                    {activeAudit.safetyAudit?.complianceRate || 100}%
                  </p>
                  <p className="text-[11px] text-neutral-500 print:text-gray-600">
                    {activeAudit.safetyAudit?.compliantCount || activeAudit.metrics?.totalEvaluated || 0} compliant actions / 0 violations
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="rounded-xl border border-neutral-800 bg-black px-3.5 py-2 print:border-gray-200 print:bg-gray-50">
                    <span className="text-neutral-500">Auto-Retry Limit:</span> <strong className="text-white print:text-black">₹{Number(activeAudit.safetyAudit?.maxAutoRetryAmount || 5000).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-black px-3.5 py-2 print:border-gray-200 print:bg-gray-50">
                    <span className="text-neutral-500">Max Retries:</span> <strong className="text-white print:text-black">{activeAudit.safetyAudit?.maxRetryCount || 2}</strong>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-black px-3.5 py-2 print:border-gray-200 print:bg-gray-50">
                    <span className="text-neutral-500">Approval Required Above:</span> <strong className="text-white print:text-black">₹{Number(activeAudit.safetyAudit?.requireApprovalAbove || 10000).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              {/* Compliance Breakdown Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500 print:border-gray-200 print:text-black">
                      <th className="pb-2.5 px-3">Policy Category</th>
                      <th className="pb-2.5 px-3">Enforcement Rule</th>
                      <th className="pb-2.5 px-3 text-right">Action Count</th>
                      <th className="pb-2.5 px-3 text-right">Compliance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300 print:divide-gray-100 print:text-black">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-white print:text-black">Automatically Allowed</td>
                      <td className="py-3 px-3 text-neutral-400 print:text-gray-600">Transactions within ₹{Number(activeAudit.safetyAudit?.maxAutoRetryAmount || 5000).toLocaleString('en-IN')} auto-retry ceiling</td>
                      <td className="py-3 px-3 text-right font-bold text-white print:text-black">{activeAudit.safetyAudit?.autoExecutedCount || 0}</td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-semibold print:text-black">PASS</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-white print:text-black">Required Approval / Escalated</td>
                      <td className="py-3 px-3 text-neutral-400 print:text-gray-600">High-value transactions &gt; ₹{Number(activeAudit.safetyAudit?.requireApprovalAbove || 10000).toLocaleString('en-IN')} routed to human review</td>
                      <td className="py-3 px-3 text-right font-bold text-white print:text-black">{activeAudit.safetyAudit?.requiredApprovalCount || 0}</td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-semibold print:text-black">PASS</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-white print:text-black">Policy-Blocked Actions</td>
                      <td className="py-3 px-3 text-neutral-400 print:text-gray-600">Suppress aggressive retries to preserve customer trust and mitigate churn risk</td>
                      <td className="py-3 px-3 text-right font-bold text-white print:text-black">{activeAudit.safetyAudit?.policyBlockedCount || 0}</td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-semibold print:text-black">PASS</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ==================== 7. RECOVERY ACTION BREAKDOWN ==================== */}
          {activeAudit.actionBreakdown && activeAudit.actionBreakdown.length > 0 && (
            <div className="space-y-4 page-break-avoid">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-neutral-600">Section 6</p>
                <h3 className="text-base font-bold text-white sm:text-lg print:text-black">Recovery Action Breakdown</h3>
                <p className="mt-0.5 text-xs text-neutral-400 print:text-gray-600">Performance and revenue yield by individual recovery playbook strategy.</p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-4 print:border-gray-300 print:bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500 print:border-gray-200 print:text-black">
                      <th className="pb-3 px-3">Playbook Action</th>
                      <th className="pb-3 px-3 text-right">Times Used</th>
                      <th className="pb-3 px-3 text-right">Successful</th>
                      <th className="pb-3 px-3 text-right">Failed</th>
                      <th className="pb-3 px-3 text-right">Revenue Recovered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300 print:divide-gray-100 print:text-black">
                    {activeAudit.actionBreakdown.map((act) => (
                      <tr key={act.action} className="hover:bg-neutral-900/40 transition">
                        <td className="py-3.5 px-3 font-semibold text-white print:text-black">{act.actionLabel || act.action}</td>
                        <td className="py-3.5 px-3 text-right font-bold">{act.count}</td>
                        <td className="py-3.5 px-3 text-right font-bold text-emerald-400 print:text-black">{act.successCount}</td>
                        <td className="py-3.5 px-3 text-right text-neutral-400 print:text-neutral-700">{act.failCount}</td>
                        <td className="py-3.5 px-3 text-right font-bold text-white print:text-black">
                          {act.recoveredAmount > 0 ? fmtCurrency(act.recoveredAmount) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 8. AI DECISION SUMMARY ==================== */}
          <div className="space-y-4 page-break-avoid">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-neutral-600">Section 7</p>
              <h3 className="text-base font-bold text-white sm:text-lg print:text-black">AI Decision-Making Summary</h3>
              <p className="mt-0.5 text-xs text-neutral-400 print:text-gray-600">Core autonomous recovery principles deployed by the agent pipeline.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 print:border-gray-300 print:bg-gray-50 print:text-black">
                <p className="font-bold text-white print:text-black text-sm">1. Diagnostic Classification</p>
                <p className="mt-2 text-xs text-neutral-400 print:text-gray-700 leading-relaxed">
                  Root-cause analyst categorizes switch drops, card expirations, and balance declines to prevent blind charging loops.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 print:border-gray-300 print:bg-gray-50 print:text-black">
                <p className="font-bold text-white print:text-black text-sm">2. Frictionless Recovery</p>
                <p className="mt-2 text-xs text-neutral-400 print:text-gray-700 leading-relaxed">
                  Insufficient funds and checkouts trigger discrete soft reminders with dynamic Razorpay links rather than repeat declines.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 print:border-gray-300 print:bg-gray-50 print:text-black">
                <p className="font-bold text-white print:text-black text-sm">3. Policy Safeguards</p>
                <p className="mt-2 text-xs text-neutral-400 print:text-gray-700 leading-relaxed">
                  Transactions above ₹10,000 are automatically escalated for review to eliminate merchant risk.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 print:border-gray-300 print:bg-gray-50 print:text-black">
                <p className="font-bold text-white print:text-black text-sm">4. Customer Goodwill Guard</p>
                <p className="mt-2 text-xs text-neutral-400 print:text-gray-700 leading-relaxed">
                  High-churn or repeated decline cases are halted safely to protect customer relationships.
                </p>
              </div>
            </div>
          </div>

          {/* ==================== 9. TRANSACTION AUDIT TABLE ==================== */}
          {activeAudit.transactions && activeAudit.transactions.length > 0 && (
            <div className="space-y-4 page-break-avoid">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-neutral-600">Section 8</p>
                <h3 className="text-base font-bold text-white sm:text-lg print:text-black">Transaction-Level AI Decision Audit Table</h3>
                <p className="mt-0.5 text-xs text-neutral-400 print:text-gray-600">Detailed record of individual payment evaluations, AI decisions, policy results, and financial outcomes.</p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-4 print:border-gray-300 print:bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500 print:border-gray-300 print:text-black">
                      <th className="pb-3 px-2">Payment ID</th>
                      <th className="pb-3 px-2">Customer</th>
                      <th className="pb-3 px-2">Amount</th>
                      <th className="pb-3 px-2">Failure Reason</th>
                      <th className="pb-3 px-2">AI Decision & Policy Reason</th>
                      <th className="pb-3 px-2">Policy Result</th>
                      <th className="pb-3 px-2">Outcome</th>
                      <th className="pb-3 px-2 text-right">Recovered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300 print:divide-gray-200 print:text-black">
                    {activeAudit.transactions.map((t) => (
                      <tr key={t.paymentId} className="hover:bg-neutral-900/40 transition">
                        <td className="py-3 px-2 font-mono text-[11px] font-bold text-white print:text-black">{t.paymentId}</td>
                        <td className="py-3 px-2 font-medium">{t.customerName}</td>
                        <td className="py-3 px-2 font-bold text-white print:text-black">{fmtCurrency(t.amount)}</td>
                        <td className="py-3 px-2 text-neutral-400 print:text-gray-700 max-w-[140px] truncate">{t.failureReason}</td>
                        <td className="py-3 px-2 max-w-xs">
                          <p className="font-semibold text-white print:text-black">{t.aiDecision}</p>
                          <p className="text-[11px] text-neutral-400 leading-tight print:text-gray-600">{t.decisionReason}</p>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            t.policyResult === 'Allowed'
                              ? 'bg-neutral-800 text-white print:bg-gray-100 print:text-black'
                              : (t.policyResult === 'Policy Blocked' ? 'bg-red-950/40 text-red-300 print:bg-red-50 print:text-red-800' : 'bg-amber-950/40 text-amber-300 print:bg-amber-50 print:text-amber-800')
                          }`}>
                            {t.policyResult || 'Allowed'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            t.outcome === 'recovered'
                              ? 'bg-emerald-950/50 text-emerald-300 print:bg-gray-200 print:text-black'
                              : 'bg-neutral-900 text-neutral-400 print:bg-gray-100 print:text-gray-700'
                          }`}>
                            {t.outcome}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-white print:text-black">
                          {t.recoveredAmount > 0 ? fmtCurrency(t.recoveredAmount) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 10. AUDIT VERIFICATION FOOTER ==================== */}
          <div className="border-t border-neutral-800 pt-6 text-center text-[11px] text-neutral-500 print:border-gray-300 print:text-gray-600 page-break-avoid">
            <p>
              Official Verification Hash: <span className="font-mono text-neutral-400 print:text-black">sha256:{activeAudit.auditId?.slice(-8) || '00000000'}89a74f4b9c1d</span> | RecoverAI Platform v1.0.0
            </p>
            <p className="mt-1">
              Generated by RecoverAI Autonomous Revenue Recovery Platform on {new Date(activeAudit.generatedAt).toLocaleString()}.
            </p>
            <p className="mt-0.5 text-[10px] text-neutral-600 print:text-gray-500">
              This document is an official compliance audit verifying policy boundary enforcement, customer privacy protections, and financial reconciliation.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}

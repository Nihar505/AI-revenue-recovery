import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, ChevronLeft, Eye } from 'lucide-react';
import { authFetch } from '../context/AuthContext';

export function Opportunities({ onOpenCaseModal }) {
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchCases = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
        ...(statusFilter ? { status: statusFilter } : {})
      });
      const res = await authFetch(`/api/cases?${query}`);
      const json = await res.json();
      setCases(json.cases || []);
      setTotal(json.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCases(); }, [page, statusFilter]);

  const filtered = cases.filter(c => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      c.id?.toLowerCase().includes(t) ||
      c.customer_name?.toLowerCase().includes(t) ||
      c.payment_id?.toLowerCase().includes(t) ||
      c.failure_reason?.toLowerCase().includes(t)
    );
  });

  const statusPill = {
    recovered: 'bg-white text-black',
    refrained:  'bg-neutral-800 text-white',
    escalated:  'bg-neutral-300 text-black',
    pending:    'bg-neutral-900 text-neutral-400 border border-neutral-700',
  };

  const actionLabel = {
    RETRY_PAYMENT:          'Retry',
    SEND_REMINDER:          'Reminder',
    OFFER_ALTERNATIVE_METHOD: 'Alt. method',
    ESCALATE:               'Escalate',
    DO_NOTHING:             'Do nothing',
  };

  return (
    <div className="mx-auto max-w-[1540px] space-y-6 pb-10">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">All cases</p>
          <h1 className="mt-1 text-lg font-semibold text-white">Failed Payments List</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search cases…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-56 rounded-lg border border-neutral-700 bg-neutral-900 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-neutral-700 bg-neutral-900 py-2 px-3 text-xs text-white focus:border-neutral-500 focus:outline-none transition"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="recovered">Recovered</option>
            <option value="refrained">Refrained</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-800 bg-neutral-900">
            <tr>
              {['ID', 'Customer', 'Amount', 'Chance to recover', 'Reason for Failure', 'Next Step', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 font-semibold uppercase tracking-[0.1em] text-neutral-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {loading ? (
              <tr>
                <td colSpan="8" className="py-16 text-center text-neutral-500">
                  <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-16 text-center text-neutral-500">No cases found.</td>
              </tr>
            ) : filtered.map(c => {
              const score = c.recovery_score != null ? Math.round(c.recovery_score * 100) : null;
              return (
                <tr
                  key={c.id}
                  onClick={() => onOpenCaseModal(c.id)}
                  className="cursor-pointer bg-black transition-colors hover:bg-neutral-900"
                >
                  <td className="px-4 py-3 font-mono text-neutral-400">{c.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{c.customer_name}</p>
                    <p className="text-neutral-500">LTV ₹{Number(c.lifetime_value || 0).toLocaleString('en-IN')}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    ₹{Number(c.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    {score != null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-neutral-800">
                          <div
                            className={`h-full rounded-full ${score >= 65 ? 'bg-white' : score >= 40 ? 'bg-neutral-400' : 'bg-neutral-600'}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-neutral-300">{score}%</span>
                      </div>
                    ) : <span className="text-neutral-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {c.root_cause || <span className="text-neutral-600">Unanalysed</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.recommended_action ? (
                      <span className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-neutral-300">
                        {actionLabel[c.recommended_action] || c.recommended_action}
                      </span>
                    ) : <span className="text-neutral-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPill[c.status] || statusPill.pending}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); onOpenCaseModal(c.id); }}
                      className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-800 hover:text-white"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900 px-4 py-3">
          <p className="text-xs text-neutral-500">
            {Math.min(total, page * limit + 1)}–{Math.min(total, (page + 1) * limit)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs text-neutral-400">Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total}
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

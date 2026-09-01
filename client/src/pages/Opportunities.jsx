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

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchCases = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          limit: limit.toString(),
          offset: (page * limit).toString(),
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(searchTerm.trim() ? { q: searchTerm.trim() } : {})
        });
        const res = await authFetch(`/api/cases?${query}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch cases');
        const json = await res.json();
        setCases(json.cases || []);
        setTotal(json.total || 0);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const handler = setTimeout(() => {
      fetchCases();
    }, 300);

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [page, statusFilter, searchTerm]);

  // Reset to first page when search or status filter changes
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setPage(0);
  };


  const statusPill = {
    recovered:        'bg-white text-black',
    refrained:        'bg-neutral-800 text-white',
    escalated:        'bg-neutral-300 text-black',
    awaiting_payment: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
    pending:          'bg-neutral-900 text-neutral-400 border border-neutral-700',
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">All Cases</p>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">Failed Payments</h1>
          <p className="mt-1 text-xs text-neutral-400">Search, filter, and inspect individual failed transactions and AI decisions.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search cases, customers…"
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-56 rounded-xl border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-xl border border-neutral-800 bg-neutral-950 py-2 px-3 text-xs text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="awaiting_payment">Awaiting Payment</option>
            <option value="recovered">Recovered</option>
            <option value="refrained">Refrained</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-800 bg-neutral-900/80">
              <tr>
                {['ID', 'Customer', 'Amount', 'Chance to recover', 'Reason for Failure', 'Next Step', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 font-semibold uppercase tracking-[0.12em] text-neutral-400 text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center text-neutral-400 text-xs">
                    <div className="mx-auto mb-2.5 h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
                    Loading cases…
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center text-neutral-400 text-xs">
                    No failed payments found matching your criteria.
                  </td>
                </tr>
              ) : cases.map(c => {
                const score = c.recovery_score != null ? Math.round(c.recovery_score * 100) : null;
                return (
                  <tr
                    key={c.id}
                    onClick={() => onOpenCaseModal(c.id)}
                    className="cursor-pointer bg-black/40 transition-colors hover:bg-neutral-900/60 group"
                  >
                    <td className="px-4 py-3.5 font-mono text-[11px] text-neutral-400 font-semibold">{c.id}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-white">{c.customer_name}</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">LTV ₹{Number(c.lifetime_value || 0).toLocaleString('en-IN')}</p>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-white">
                      ₹{Number(c.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5">
                      {score != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-neutral-800">
                            <div
                              className={`h-full rounded-full ${score >= 65 ? 'bg-white' : score >= 40 ? 'bg-neutral-400' : 'bg-neutral-600'}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="text-neutral-300 font-mono text-[11px]">{score}%</span>
                        </div>
                      ) : <span className="text-neutral-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-300 max-w-xs truncate">
                      {c.root_cause || <span className="text-neutral-500">Unanalysed</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {c.recommended_action ? (
                        <span className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
                          {actionLabel[c.recommended_action] || c.recommended_action}
                        </span>
                      ) : <span className="text-neutral-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusPill[c.status] || statusPill.pending}`}>
                          {c.status === 'awaiting_payment' ? 'Awaiting Payment' : c.status}
                        </span>
                        {c.outcome_source === 'razorpay_webhook' && (
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400" title="Razorpay Webhook Verified">
                            RZP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); onOpenCaseModal(c.id); }}
                        aria-label={`View details for case ${c.id}`}
                        className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900/60 px-5 py-3">
          <p className="text-xs text-neutral-400">
            Showing <strong className="text-white">{Math.min(total, page * limit + 1)}–{Math.min(total, (page + 1) * limit)}</strong> of <strong className="text-white">{total}</strong> cases
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="rounded-lg border border-neutral-800 bg-neutral-950 p-1.5 text-neutral-400 transition hover:border-neutral-700 hover:text-white disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2.5 text-xs text-neutral-300 font-medium">Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= total}
              aria-label="Next page"
              className="rounded-lg border border-neutral-800 bg-neutral-950 p-1.5 text-neutral-400 transition hover:border-neutral-700 hover:text-white disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

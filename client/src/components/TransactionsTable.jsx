import { useEffect, useState } from 'react';
import { api } from '../api';

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusStyle(status) {
  switch (status) {
    case 'RECOVERED':
      return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    case 'RECOVERING':
      return 'bg-amber-50 text-amber-600 border-amber-200';
    case 'PENDING_REVIEW':
      return 'bg-indigo-50 text-indigo-600 border-indigo-200';
    case 'LOST':
      return 'bg-red-50 text-red-500 border-red-200';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200';
  }
}

function formatStatus(status) {
  return status.replaceAll('_', ' ');
}

function formatFailureReason(reason) {
  return reason.replaceAll('_', ' ');
}

export default function TransactionsTable({ refreshKey, bumpRefresh }) {
  const [transactions, setTransactions] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [messageModal, setMessageModal] = useState(null); // { title, message, note }

  function load() {
    const params = {};
    if (groupFilter) params.group = groupFilter;
    if (statusFilter) params.status = statusFilter;

    api
      .getTransactions(params)
      .then(setTransactions)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, [refreshKey, statusFilter, groupFilter]);

  async function handleReview(id, decision) {
    try {
      await api.reviewTransaction(id, decision);
      load();
      bumpRefresh();
    } catch (e) {
      alert(`Review action failed: ${e.message}`);
    }
  }

  async function handleHinglishOffer(id) {
    try {
      const result = await api.getHinglishOffer(id);
      setMessageModal({
        title: 'Hinglish payment-plan offer',
        message: result.message,
        note: 'Draft script for a human agent to read out or send manually -- not sent automatically.',
      });
    } catch (e) {
      alert(`Hinglish offer generation failed: ${e.message}`);
    }
  }

  if (error) {
    return <p className="p-8 text-sm text-slate-500">Could not load transactions: {error}</p>;
  }

  if (!transactions) {
    return <p className="p-8 text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div className="w-full max-w-[1480px] mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="text-[17px] font-medium text-slate-500">Filter by:</span>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="h-14 min-w-[225px] px-6 rounded-full border border-slate-200 bg-white text-[17px] font-medium text-slate-700 outline-none cursor-pointer shadow-sm"
          >
            <option value="">All groups</option>
            <option value="treatment">Treatment group</option>
            <option value="control">Control group</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-14 min-w-[225px] px-6 rounded-full border border-slate-200 bg-white text-[17px] font-medium text-slate-700 outline-none cursor-pointer shadow-sm"
          >
            <option value="">All statuses</option>
            <option value="RECOVERED">Recovered</option>
            <option value="RECOVERING">Retrying</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="LOST">Lost</option>
          </select>
        </div>

        <div className="text-[17px] font-medium text-slate-400">{transactions.length} transactions</div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">ID</th>
                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">Customer</th>
                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">Failure Reason</th>
                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">Status</th>
                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">Agent Reasoning</th>
                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors">
                  <td className="px-8 py-7 text-[16px] font-medium text-slate-500 whitespace-nowrap">#{t.id}</td>
                  <td className="px-6 py-7 text-[17px] font-semibold text-slate-800 whitespace-nowrap">{t.customerName}</td>
                  <td className="px-6 py-7 text-[17px] font-bold text-slate-800 whitespace-nowrap">{formatINR(t.amount)}</td>
                  <td className="px-6 py-7 text-[17px] text-slate-500 whitespace-nowrap">{formatFailureReason(t.failureReason)}</td>
                  <td className="px-6 py-7 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-4 py-2 text-[15px] font-semibold border ${getStatusStyle(t.status)}`}>
                      {formatStatus(t.status)}
                    </span>
                  </td>
                  <td className="px-6 py-7 max-w-[300px]">
                    <p className="text-[16px] leading-6 text-slate-500 line-clamp-2" title={t.latestAction?.reasoning || ''}>
                      {t.latestAction?.reasoning || '\u2014'}
                    </p>
                  </td>
                  <td className="px-6 py-7 whitespace-nowrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      {t.status === 'PENDING_REVIEW' && (
                        <>
                          <button
                            onClick={() => handleReview(t.id, 'approve')}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-[15px] font-semibold text-emerald-600 hover:bg-emerald-100 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(t.id, 'reject')}
                            className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-[15px] font-semibold text-red-500 hover:bg-red-100 transition"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {t.status !== 'RECOVERED' && (
                        <button
                          onClick={() => handleHinglishOffer(t.id)}
                          className="rounded-full border border-violet-200 bg-violet-50 px-5 py-2.5 text-[15px] font-semibold text-violet-600 hover:bg-violet-100 transition"
                        >
                          Hinglish Offer
                        </button>
                      )}

                      {t.status === 'RECOVERED' && <span className="text-slate-300 text-lg">\u2014</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {messageModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-5"
          onClick={() => setMessageModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-block text-xs font-semibold uppercase tracking-wide text-violet-600 bg-violet-50 px-3 py-1 rounded-full mb-4">
              {messageModal.title}
            </div>
            <p className="text-[16px] leading-7 text-slate-700 bg-slate-50 rounded-xl p-5 whitespace-pre-wrap">
              {messageModal.message}
            </p>
            {messageModal.note && (
              <p className="text-xs text-slate-400 mt-3 italic">{messageModal.note}</p>
            )}
            <button
              onClick={() => setMessageModal(null)}
              className="mt-5 w-full py-3 rounded-full text-white font-semibold text-sm"
              style={{ background: '#3E5FF0' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
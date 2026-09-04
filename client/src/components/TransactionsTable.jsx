

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

  function load() {
    const params = {};

    if (groupFilter) {
      params.group = groupFilter;
    }

    if (statusFilter) {
      params.status = statusFilter;
    }

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

  async function handleGenerateMessage(id) {
    try {
      const result = await api.generateMessage(id);

      if (!result.message) {
        alert(
          "No customer message applies to this transaction's current action."
        );
        return;
      }

      alert(`Customer message (${result.source}):\n\n${result.message}`);
    } catch (e) {
      alert(`Message generation failed: ${e.message}`);
    }
  }

  if (error) {
    return (
      <p className="p-8 text-sm text-slate-500">
        Could not load transactions: {error}
      </p>
    );
  }

  if (!transactions) {
    return (
      <p className="p-8 text-sm text-slate-500">
        Loading...
      </p>
    );
  }

  return (
    <div className="w-full max-w-[1480px] mx-auto px-8 py-8">

      {/* FILTER BAR */}
      <div className="flex items-center justify-between mb-8">

        <div className="flex items-center gap-4">

          <span className="text-[17px] font-medium text-slate-500">
            Filter by:
          </span>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="
              h-14
              min-w-[225px]
              px-6
              rounded-full
              border
              border-slate-200
              bg-white
              text-[17px]
              font-medium
              text-slate-700
              outline-none
              cursor-pointer
              shadow-sm
            "
          >
            <option value="">All groups</option>
            <option value="treatment">Treatment group</option>
            <option value="control">Control group</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="
              h-14
              min-w-[225px]
              px-6
              rounded-full
              border
              border-slate-200
              bg-white
              text-[17px]
              font-medium
              text-slate-700
              outline-none
              cursor-pointer
              shadow-sm
            "
          >
            <option value="">All statuses</option>
            <option value="RECOVERED">Recovered</option>
            <option value="RECOVERING">Retrying</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="LOST">Lost</option>
          </select>

        </div>

        <div className="text-[17px] font-medium text-slate-400">
          {transactions.length} transactions
        </div>

      </div>

      {/* TABLE */}
      <div
        className="
          overflow-hidden
          rounded-[24px]
          border
          border-slate-100
          bg-white
          shadow-[0_2px_12px_rgba(15,23,42,0.05)]
        "
      >
        <div className="overflow-x-auto">

          <table className="w-full min-w-[1250px] border-collapse">

            <thead>
              <tr className="border-b border-slate-100">

                <th className="px-8 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">
                  ID
                </th>

                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">
                  Customer
                </th>

                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">
                  Amount
                </th>

                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">
                  Failure Reason
                </th>

                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">
                  Status
                </th>

                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">
                  Agent Reasoning
                </th>

                <th className="px-6 py-6 text-left text-[14px] font-bold tracking-wide text-slate-500 uppercase">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody>

              {transactions.map((t) => (

                <tr
                  key={t.id}
                  className="
                    border-b
                    border-slate-100
                    last:border-b-0
                    hover:bg-slate-50/40
                    transition-colors
                  "
                >

                  <td className="px-8 py-7 text-[16px] font-medium text-slate-500 whitespace-nowrap">
                    #{t.id}
                  </td>

                  <td className="px-6 py-7 text-[17px] font-semibold text-slate-800 whitespace-nowrap">
                    {t.customerName}
                  </td>

                  <td className="px-6 py-7 text-[17px] font-bold text-slate-800 whitespace-nowrap">
                    {formatINR(t.amount)}
                  </td>

                  <td className="px-6 py-7 text-[17px] text-slate-500 whitespace-nowrap">
                    {formatFailureReason(t.failureReason)}
                  </td>

                  <td className="px-6 py-7 whitespace-nowrap">

                    <span
                      className={`
                        inline-flex
                        items-center
                        rounded-full
                        px-4
                        py-2
                        text-[15px]
                        font-semibold
                        border
                        ${getStatusStyle(t.status)}
                      `}
                    >
                      {formatStatus(t.status)}
                    </span>

                  </td>

                  <td className="px-6 py-7 max-w-[300px]">

                    <p
                      className="
                        text-[16px]
                        leading-6
                        text-slate-500
                        line-clamp-2
                      "
                      title={t.latestAction?.reasoning || ''}
                    >
                      {t.latestAction?.reasoning || '—'}
                    </p>

                  </td>

                  <td className="px-6 py-7 whitespace-nowrap">

                    {t.status === 'PENDING_REVIEW' && (
                      <div className="flex items-center gap-3">

                        <button
                          onClick={() =>
                            handleReview(t.id, 'approve')
                          }
                          className="
                            rounded-full
                            border
                            border-emerald-200
                            bg-emerald-50
                            px-5
                            py-2.5
                            text-[15px]
                            font-semibold
                            text-emerald-600
                            hover:bg-emerald-100
                            transition
                          "
                        >
                          Approve
                        </button>

                        <button
                          onClick={() =>
                            handleReview(t.id, 'reject')
                          }
                          className="
                            rounded-full
                            border
                            border-red-200
                            bg-red-50
                            px-5
                            py-2.5
                            text-[15px]
                            font-semibold
                            text-red-500
                            hover:bg-red-100
                            transition
                          "
                        >
                          Reject
                        </button>

                      </div>
                    )}

                    {(t.latestAction?.actionType === 'REMINDER' ||
                      t.latestAction?.actionType === 'UPDATE_METHOD') && (

                      <button
                        onClick={() =>
                          handleGenerateMessage(t.id)
                        }
                        className="
                          rounded-full
                          border
                          border-indigo-200
                          bg-indigo-50
                          px-5
                          py-2.5
                          text-[15px]
                          font-semibold
                          text-indigo-600
                          hover:bg-indigo-100
                          transition
                        "
                      >
                        Generate message
                      </button>

                    )}

                    {t.status !== 'PENDING_REVIEW' &&
                      t.latestAction?.actionType !== 'REMINDER' &&
                      t.latestAction?.actionType !== 'UPDATE_METHOD' && (
                        <span className="text-slate-300 text-lg">
                          —
                        </span>
                      )}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      </div>

    </div>
  );
}
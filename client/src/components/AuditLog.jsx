

import { useEffect, useState } from 'react';
import { api } from '../api';

const DOT_COLOR = {
  RETRY: '#10b981',
  REMINDER: '#10b981',
  UPDATE_METHOD: '#10b981',
  STOP: '#ef4444',
  ESCALATE: '#3E5FF0',
  NO_ACTION: '#94a3b8',
};

function formatTime(iso) {
  const d = new Date(iso);

  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AuditLog({ refreshKey }) {
  const [actions, setActions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getAudit(150)
      .then(setActions)
      .catch((e) => setError(e.message));
  }, [refreshKey]);

  if (error) {
    return (
      <p className="p-8 text-sm text-slate-500">
        Could not load the audit log: {error}
      </p>
    );
  }

  if (!actions) {
    return (
      <p className="p-8 text-sm text-slate-500">
        Loading...
      </p>
    );
  }

  if (actions.length === 0) {
    return (
      <p className="p-8 text-sm text-slate-500">
        No decisions logged yet -- run the agent first.
      </p>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-8 py-10">

      {/* HEADER */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-slate-800">
          Audit Log
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Recent agent decisions and their outcomes
        </p>
      </div>

      {/* TIMELINE */}
      <div className="relative">

        {actions.map((a, i) => (

          <div
            key={a.id}
            className="flex gap-5"
          >

            {/* TIMELINE DOT + LINE */}
            <div className="flex flex-col items-center">

              <div
                className="
                  w-3
                  h-3
                  rounded-full
                  mt-1.5
                  flex-shrink-0
                  ring-4
                  ring-white
                "
                style={{
                  background:
                    DOT_COLOR[a.actionType] || '#94a3b8',
                }}
              />

              {i < actions.length - 1 && (
                <div className="w-px flex-1 bg-slate-100 my-1" />
              )}

            </div>

            {/* EVENT CONTENT */}
            <div className="pb-9 flex-1">

              {/* META INFORMATION */}
              <div className="flex flex-wrap items-center gap-2 mb-2">

                <span className="text-xs font-mono text-slate-400">
                  {formatTime(a.createdAt)}
                </span>

                <span className="text-xs text-slate-300">
                  ·
                </span>

                <span className="text-xs font-mono font-medium text-slate-500">
                  #{a.transactionId}
                </span>

                <span
                  className="
                    inline-flex
                    items-center
                    px-2.5
                    py-1
                    rounded-full
                    text-xs
                    font-semibold
                    bg-slate-50
                    text-slate-600
                    border
                    border-slate-200
                  "
                >
                  {a.actionType}
                </span>

                {a.result && (
                  <>
                    <span className="text-slate-300">
                      →
                    </span>

                    <span className="text-xs text-slate-500 font-medium">
                      {a.result}
                    </span>
                  </>
                )}

              </div>

              {/* REASONING */}
              <div
                className="
                  rounded-2xl
                  border
                  border-slate-100
                  bg-white
                  px-5
                  py-4
                  shadow-[0_2px_10px_rgba(15,23,42,0.04)]
                "
              >
                <p className="text-sm text-slate-500 leading-6">
                  {a.reasoning}
                </p>
              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}
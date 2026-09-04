import { useEffect, useState } from 'react';
import { api } from '../api';

function fmtINR(n) {
  return `\u20b9${n.toLocaleString('en-IN')}`;
}

export default function Overview({ refreshKey, onRunAgent, running }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSummary().then(setSummary).catch((e) => setError(e.message));
  }, [refreshKey]);

  if (error) return <p className="p-8 text-sm text-slate-500">Could not load summary: {error}</p>;
  if (!summary) return <p className="p-8 text-sm text-slate-500">Loading...</p>;

  const agentRate = summary.treatmentRecoveryRate * 100;
  const controlRate = summary.controlRecoveryRate * 100;
  const lift = summary.lift * 100;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <p className="text-sm font-medium text-slate-500 mb-1">Recovered by the agent</p>
          <p className="text-5xl font-extrabold text-slate-900 tracking-tight tabular-nums transition-all duration-700">
            {fmtINR(summary.treatmentRecoveredAmount)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{summary.treatmentRecoveredCount} transactions</span> \u00b7{' '}
            {agentRate.toFixed(1)}% recovery rate
          </p>
          <div className="mt-5 h-px bg-slate-100" />
          <p className="mt-4 text-xs text-slate-400">Live \u00b7 updates on every agent run</p>
        </div>

        <div className="bg-[#3E5FF0] rounded-2xl p-8 text-white flex flex-col justify-center">
          <p className="text-sm font-medium text-indigo-200 mb-2">Lift vs. control group baseline</p>
          <p className="text-5xl font-extrabold tracking-tight">
            {lift >= 0 ? '+' : ''}
            {lift.toFixed(1)}pp
          </p>
          <p className="mt-2 text-lg font-medium text-indigo-100">
            Agent: <span className="text-white font-bold">{agentRate.toFixed(1)}%</span> \u00b7 Control:{' '}
            <span className="text-indigo-300">{controlRate.toFixed(1)}%</span>
          </p>
          <p className="mt-4 text-xs text-indigo-300">
            Based on {summary.treatmentTotal + summary.controlTotal} transactions randomised into agent vs. control
            groups.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-700"
                style={{ width: `${Math.min(agentRate, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-indigo-200 w-12">Agent</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 bg-white/20 rounded-full h-2">
              <div
                className="bg-indigo-300 rounded-full h-2 transition-all duration-700"
                style={{ width: `${Math.min(controlRate, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-indigo-200 w-12">Control</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Still retrying', value: summary.stillRetrying, sub: 'active retry attempts', icon: '\u21bb', color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Awaiting human review', value: summary.pendingReview, sub: 'require merchant action', icon: '\u23f3', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Written off', value: summary.lost, sub: 'recovery halted by agent', icon: '\u2715', color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Control group', value: summary.controlTotal, sub: 'no agent action taken', icon: '\u25f7', color: 'text-slate-500', bg: 'bg-slate-50' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} mb-4`}>
              <span className={`text-lg ${c.color}`}>{c.icon}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums transition-all duration-700">{c.value}</p>
            <p className="text-sm font-medium text-slate-700 mt-0.5">{c.label}</p>
            <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onRunAgent}
          disabled={running}
          className="flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold text-sm shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
          style={{ background: '#3E5FF0' }}
        >
          <span>{'\u26a1'}</span>
          {running ? 'Running...' : 'Run agent on open transactions'}
        </button>
      </div>
    </div>
  );
}
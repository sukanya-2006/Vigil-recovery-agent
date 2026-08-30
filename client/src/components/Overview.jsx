// import { useEffect, useState } from 'react';
// import { api } from '../api';

// // Formats a number as Indian rupees, e.g. 2415642 -> "₹24,15,642"
// function formatINR(amount) {
//   return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
//     amount
//   );
// }

// export default function Overview({ refreshKey, onRunAgent, running }) {
//   const [summary, setSummary] = useState(null);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     api.getSummary().then(setSummary).catch((e) => setError(e.message));
//   }, [refreshKey]);

//   if (error) return <p style={{ color: '#f87171' }}>Failed to load summary: {error}</p>;
//   if (!summary) return <p>Loading...</p>;

//   return (
//     <div>
//       <div className="cards">
//         <div className="card">
//           <div className="label">Recovered (treatment)</div>
//           <div className="value">{formatINR(summary.treatmentRecoveredAmount)}</div>
//           <div className="sub">
//             {summary.treatmentRecoveredCount}/{summary.treatmentTotal} transactions (
//             {(summary.treatmentRecoveryRate * 100).toFixed(1)}%)
//           </div>
//         </div>
//         <div className="card">
//           <div className="label">Control group baseline</div>
//           <div className="value">{(summary.controlRecoveryRate * 100).toFixed(1)}%</div>
//           <div className="sub">
//             {summary.controlRecoveredCount}/{summary.controlTotal} recovered with no agent involved
//           </div>
//         </div>
//         <div className="card">
//           <div className="label">Agent lift</div>
//           <div className="value">+{(summary.lift * 100).toFixed(1)}pp</div>
//           <div className="sub">recovery rate vs. doing nothing</div>
//         </div>
//         <div className="card">
//           <div className="label">Still retrying</div>
//           <div className="value">{summary.stillRetrying}</div>
//         </div>
//         <div className="card">
//           <div className="label">Pending human review</div>
//           <div className="value">{summary.pendingReview}</div>
//         </div>
//         <div className="card">
//           <div className="label">Written off (lost)</div>
//           <div className="value">{summary.lost}</div>
//         </div>
//       </div>

//       <button className="action" onClick={onRunAgent} disabled={running}>
//         {running ? 'Running agent...' : 'Run agent on open transactions'}
//       </button>
//     </div>
//   );
// }



import { useEffect, useState } from 'react';
import { api } from '../api';

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    amount
  );
}

export default function Overview({ refreshKey, onRunAgent, running }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSummary().then(setSummary).catch((e) => setError(e.message));
  }, [refreshKey]);

  if (error) return <p className="state">Could not load the ledger: {error}</p>;
  if (!summary) return <p className="state">Loading...</p>;

  return (
    <div>
      <div className="hero-strip">
        <div>
          <div className="hero-label">Recovered by the agent</div>
          <div className="hero-value">{formatINR(summary.treatmentRecoveredAmount)}</div>
          <div className="hero-sub">
            {summary.treatmentRecoveredCount} of {summary.treatmentTotal} at-risk transactions (
            {(summary.treatmentRecoveryRate * 100).toFixed(1)}%)
          </div>
        </div>
        <div className="lift-badge">
          <div className="lift-value">+{(summary.lift * 100).toFixed(1)}pp</div>
          <div className="lift-label">vs. {(summary.controlRecoveryRate * 100).toFixed(1)}% doing nothing</div>
        </div>
      </div>

      <div className="ledger-rows">
        <div className="ledger-row">
          <span className="row-label">Still retrying</span>
          <span className="row-value">{summary.stillRetrying}</span>
        </div>
        <div className="ledger-row">
          <span className="row-label">Awaiting human review</span>
          <span className="row-value">{summary.pendingReview}</span>
        </div>
        <div className="ledger-row">
          <span className="row-label">Written off (not worth pursuing)</span>
          <span className="row-value">{summary.lost}</span>
        </div>
        <div className="ledger-row">
          <span className="row-label">Control group (untouched, for comparison)</span>
          <span className="row-value">
            {summary.controlRecoveredCount}/{summary.controlTotal}
          </span>
        </div>
      </div>

      <button className="run-button" onClick={onRunAgent} disabled={running}>
        {running ? 'Running...' : 'Run agent on open transactions'}
      </button>
    </div>
  );
}
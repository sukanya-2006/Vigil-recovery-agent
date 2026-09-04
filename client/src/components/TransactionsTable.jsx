// import { useEffect, useState } from 'react';
// import { api } from '../api';

// function formatINR(amount) {
//   return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
//     amount
//   );
// }

// export default function TransactionsTable({ refreshKey, bumpRefresh }) {
//   const [transactions, setTransactions] = useState(null);
//   const [error, setError] = useState(null);
//   const [statusFilter, setStatusFilter] = useState('');
//   const [groupFilter, setGroupFilter] = useState('treatment');

//   function load() {
//     const params = { group: groupFilter };
//     if (statusFilter) params.status = statusFilter;
//     api.getTransactions(params).then(setTransactions).catch((e) => setError(e.message));
//   }

//   useEffect(load, [refreshKey, statusFilter, groupFilter]);

//   async function handleReview(id, decision) {
//     try {
//       await api.reviewTransaction(id, decision);
//       load();
//       bumpRefresh();
//     } catch (e) {
//       alert(`Review action failed: ${e.message}`);
//     }
//   }

//   if (error) return <p className="state">Could not load transactions: {error}</p>;
//   if (!transactions) return <p className="state">Loading...</p>;

//   return (
//     <div>
//       <div className="filters">
//         <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
//           <option value="treatment">Treatment group</option>
//           <option value="control">Control group</option>
//         </select>
//         <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
//           <option value="">All statuses</option>
//           <option value="RECOVERED">Recovered</option>
//           <option value="RECOVERING">Still retrying</option>
//           <option value="PENDING_REVIEW">Pending review</option>
//           <option value="LOST">Lost</option>
//         </select>
//       </div>

//       <table className="receipt-table">
//         <thead>
//           <tr>
//             <th>ID</th>
//             <th>Customer</th>
//             <th>Amount</th>
//             <th>Failure reason</th>
//             <th>Status</th>
//             <th>Agent's reasoning</th>
//             <th></th>
//           </tr>
//         </thead>
//         <tbody>
//           {transactions.map((t) => (
//             <tr key={t.id}>
//               <td>#{t.id}</td>
//               <td>{t.customerName}</td>
//               <td className="amount">{formatINR(t.amount)}</td>
//               <td>{t.failureReason.replaceAll('_', ' ').toLowerCase()}</td>
//               <td>
//                 <span className={`stamp ${t.status}`}>{t.status.replaceAll('_', ' ')}</span>
//               </td>
//               <td className="reasoning">{t.latestAction?.reasoning || '—'}</td>
//               <td>
//                 {t.status === 'PENDING_REVIEW' && (
//                   <>
//                     <button className="review-btn approve" onClick={() => handleReview(t.id, 'approve')}>
//                       Approve
//                     </button>
//                     <button className="review-btn reject" onClick={() => handleReview(t.id, 'reject')}>
//                       Reject
//                     </button>
//                   </>
//                 )}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
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

export default function TransactionsTable({ refreshKey, bumpRefresh }) {
  const [transactions, setTransactions] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('treatment');

  function load() {
    const params = { group: groupFilter };
    if (statusFilter) params.status = statusFilter;
    api.getTransactions(params).then(setTransactions).catch((e) => setError(e.message));
  }

  useEffect(load, [refreshKey, statusFilter, groupFilter]);

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
        alert('No customer message applies to this transaction\'s current action.');
        return;
      }
      alert(`Customer message (${result.source}):\n\n${result.message}`);
    } catch (e) {
      alert(`Message generation failed: ${e.message}`);
    }
  }

  if (error) return <p className="state">Could not load transactions: {error}</p>;
  if (!transactions) return <p className="state">Loading...</p>;

  return (
    <div>
      <div className="filters">
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
          <option value="treatment">Treatment group</option>
          <option value="control">Control group</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="RECOVERED">Recovered</option>
          <option value="RECOVERING">Still retrying</option>
          <option value="PENDING_REVIEW">Pending review</option>
          <option value="LOST">Lost</option>
        </select>
      </div>

      <table className="receipt-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Failure reason</th>
            <th>Status</th>
            <th>Agent's reasoning</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>#{t.id}</td>
              <td>{t.customerName}</td>
              <td className="amount">{formatINR(t.amount)}</td>
              <td>{t.failureReason.replaceAll('_', ' ').toLowerCase()}</td>
              <td>
                <span className={`stamp ${t.status}`}>{t.status.replaceAll('_', ' ')}</span>
              </td>
              <td className="reasoning">{t.latestAction?.reasoning || '—'}</td>
              <td>
                {t.status === 'PENDING_REVIEW' && (
                  <>
                    <button className="review-btn approve" onClick={() => handleReview(t.id, 'approve')}>
                      Approve
                    </button>
                    <button className="review-btn reject" onClick={() => handleReview(t.id, 'reject')}>
                      Reject
                    </button>
                  </>
                )}
                {(t.latestAction?.actionType === 'REMINDER' || t.latestAction?.actionType === 'UPDATE_METHOD') && (
                  <button className="review-btn approve" onClick={() => handleGenerateMessage(t.id)}>
                    Generate message
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
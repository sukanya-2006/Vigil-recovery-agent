// import { useState } from 'react';
// import Overview from './components/Overview.jsx';
// import TransactionsTable from './components/TransactionsTable.jsx';
// import AuditLog from './components/AuditLog.jsx';
// import MockCheckout from './components/MockCheckout.jsx';
// import { api } from './api';
// import LiveConsole from './components/LiveConsole.jsx';


// export default function App() {
//   const [tab, setTab] = useState('overview');
//   const [refreshKey, setRefreshKey] = useState(0);
//   const [running, setRunning] = useState(false);

//   function bumpRefresh() {
//     setRefreshKey((k) => k + 1);
//   }

//   async function handleRunAgent() {
//     setRunning(true);
//     try {
//       await api.runAgent();
//       bumpRefresh();
//     } catch (e) {
//       alert(`Agent run failed: ${e.message}`);
//     } finally {
//       setRunning(false);
//     }
//   }

//   return (
//     <div className="app">
//       <div className="masthead">
//         <div className="eyebrow">Razorpay AI Revenue Recovery Agent</div>
//         <h1>Don't just lose the sale. <span className="highlight">Chase it back.</span></h1>
//         <p className="tagline">Detects at-risk payments, decides the right recovery action, and shows exactly what it did.</p>
//       </div>

//       <div className="tabs">
//         <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
//           Overview
//         </button>
//         <button className={`tab ${tab === 'transactions' ? 'active' : ''}`} onClick={() => setTab('transactions')}>
//           Transactions
//         </button>
//         <button className={`tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>
//           Audit log
//         </button>
//         <button className={`tab ${tab === 'demo' ? 'active' : ''}`} onClick={() => setTab('demo')}>
//         Make your payment
//          </button>

//           <button className={`tab ${tab === 'console' ? 'active' : ''}`} onClick={() => setTab('console')}>
//        Live Console
//       </button>
//       </div>

//       <div className="tab-panel">
//         {tab === 'overview' && <Overview refreshKey={refreshKey} onRunAgent={handleRunAgent} running={running} />}
//         {tab === 'transactions' && <TransactionsTable refreshKey={refreshKey} bumpRefresh={bumpRefresh} />}
//         {tab === 'audit' && <AuditLog refreshKey={refreshKey} />}
//         {tab === 'demo' && <MockCheckout onComplete={bumpRefresh} />}
//         {tab === 'console' && <LiveConsole />}
//       </div>
//     </div>
//   );
// }




import { useState } from 'react';
import Overview from './components/Overview.jsx';
import TransactionsTable from './components/TransactionsTable.jsx';
import AuditLog from './components/AuditLog.jsx';
import MockCheckout from './components/MockCheckout.jsx';
import LiveConsole from './components/LiveConsole.jsx';
import { api } from './api';

function ShieldLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
      <path d="M12 2L4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3z" />
    </svg>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'demo', label: 'Make a Payment' },
  { id: 'console', label: 'Live Console' },
];

export default function App() {
  const [tab, setTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [running, setRunning] = useState(false);

  function bumpRefresh() {
    setRefreshKey((k) => k + 1);
  }

  async function handleRunAgent() {
    setRunning(true);
    try {
      await api.runAgent();
      bumpRefresh();
    } catch (e) {
      alert(`Agent run failed: ${e.message}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-4 h-16">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#3E5FF0' }}>
              <ShieldLogo />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">RazorGuard</p>
              <p className="text-xs text-slate-400 leading-tight font-medium">AI Revenue Recovery</p>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-100 mx-1" />

          <nav className="flex items-center gap-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === t.id ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
                style={tab === t.id ? { background: '#3E5FF0' } : {}}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-slate-500 font-medium text-xs">Agent active</span>
          </div>
        </div>
      </header>

      <main>
        {tab === 'overview' && <Overview refreshKey={refreshKey} onRunAgent={handleRunAgent} running={running} />}
        {tab === 'transactions' && <TransactionsTable refreshKey={refreshKey} bumpRefresh={bumpRefresh} />}
        {tab === 'audit' && <AuditLog refreshKey={refreshKey} />}
        {tab === 'demo' && <MockCheckout onComplete={bumpRefresh} />}
        {tab === 'console' && <LiveConsole />}
      </main>
    </div>
  );
}
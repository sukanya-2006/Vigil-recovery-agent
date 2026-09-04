import { useState } from 'react';
import Overview from './components/Overview.jsx';
import TransactionsTable from './components/TransactionsTable.jsx';
import AuditLog from './components/AuditLog.jsx';
import MockCheckout from './components/MockCheckout.jsx';
import { api } from './api';


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
    <div className="app">
      <div className="masthead">
        <div className="eyebrow">Revenue Recovery Agent</div>
        <h1>Don't just lose the sale. <span className="highlight">Chase it back.</span></h1>
        <p className="tagline">Detects at-risk payments, decides the right recovery action, and shows exactly what it did.</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={`tab ${tab === 'transactions' ? 'active' : ''}`} onClick={() => setTab('transactions')}>
          Transactions
        </button>
        <button className={`tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>
          Audit log
        </button>
        <button className={`tab ${tab === 'demo' ? 'active' : ''}`} onClick={() => setTab('demo')}>
        Live Demo
         </button>
      </div>

      <div className="tab-panel">
        {tab === 'overview' && <Overview refreshKey={refreshKey} onRunAgent={handleRunAgent} running={running} />}
        {tab === 'transactions' && <TransactionsTable refreshKey={refreshKey} bumpRefresh={bumpRefresh} />}
        {tab === 'audit' && <AuditLog refreshKey={refreshKey} />}
        {tab === 'demo' && <MockCheckout onComplete={bumpRefresh} />}
      </div>
    </div>
  );
}
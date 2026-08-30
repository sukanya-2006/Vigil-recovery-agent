import { useEffect, useState } from 'react';
import { api } from '../api';

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditLog({ refreshKey }) {
  const [actions, setActions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAudit(150).then(setActions).catch((e) => setError(e.message));
  }, [refreshKey]);

  if (error) return <p className="state">Could not load the audit log: {error}</p>;
  if (!actions) return <p className="state">Loading...</p>;
  if (actions.length === 0) return <p className="state">No decisions logged yet -- run the agent first.</p>;

  return (
    <div>
      {actions.map((a) => (
        <div className="audit-entry" key={a.id}>
          <div className="audit-time">{formatTime(a.createdAt)}</div>
          <div className="audit-body">
            <div>
              <strong>#{a.transactionId}</strong> &mdash; <span className={`stamp ${a.actionType}`}>{a.actionType}</span>
              {a.result && <> &rarr; {a.result}</>}
            </div>
            <div className="audit-reasoning">{a.reasoning}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
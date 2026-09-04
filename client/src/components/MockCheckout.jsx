import { useState, useEffect } from 'react';
import { api } from '../api';
import './MockCheckout.css';

const TEST_CARDS = [
  { number: '4111 1111 1111 1111', label: 'Network Timeout → usually recovers', reason: 'NETWORK_TIMEOUT' },
  { number: '4000 0000 0000 0002', label: 'Issuer Declined → often recovers', reason: 'ISSUER_DECLINED' },
  { number: '4000 0000 0000 9995', label: 'Insufficient Funds → rarely recovers', reason: 'INSUFFICIENT_FUNDS' },
  { number: '4000 0000 0000 0069', label: 'Expired Card → never recovers via retry', reason: 'EXPIRED_CARD' },
  { number: '4000 0000 0000 3220', label: '3DS Failure → needs a reminder, not a retry', reason: 'THREE_DS_FAILURE' },
];

// Steps the recovery timeline animates through, in order. Each has a
// minimum display time so the demo doesn't blink past a step even if the
// backend responds instantly.
const TIMELINE_STEPS = ['processing', 'failed', 'diagnosing', 'decided', 'executing', 'result'];

export default function MockCheckout({ onComplete }) {
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [amount, setAmount] = useState('4999');
  const [customerName, setCustomerName] = useState('Demo Customer');
  const [stepIndex, setStepIndex] = useState(-1); // -1 = form not yet submitted
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const isRunning = stepIndex >= 0 && stepIndex < TIMELINE_STEPS.length - 1;

  async function handlePay(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setStepIndex(0); // -> "processing"

    try {
      const data = await api.simulateDemoPayment({ cardNumber, amount, customerName });
      setResult(data);
    } catch (err) {
      setError(err.message);
      setStepIndex(-1);
    }
  }

  // Advance through the timeline steps with a minimum delay each, once we
  // have a result to animate toward. This is what makes it feel like a
  // live process instead of a table dumped on screen instantly.
  useEffect(() => {
    if (!result || stepIndex < 0) return;
    if (stepIndex >= TIMELINE_STEPS.length - 1) {
      onComplete?.();
      return;
    }
    const delay = stepIndex === 0 ? 900 : 1100; // "processing" is quick, later steps linger
    const timer = setTimeout(() => setStepIndex((i) => i + 1), delay);
    return () => clearTimeout(timer);
  }, [stepIndex, result]);

  function reset() {
    setStepIndex(-1);
    setResult(null);
    setError(null);
  }

  const currentStep = stepIndex >= 0 ? TIMELINE_STEPS[stepIndex] : null;

  return (
    <div className="mock-checkout-wrapper">
      <div className="mock-checkout-card">
        <div className="mock-checkout-header">
          <span className="mock-checkout-badge">DEMO / TEST MODE</span>
          <h2>Complete your payment</h2>
          <p className="mock-checkout-amount">₹{amount || '0'}</p>
        </div>

        {stepIndex === -1 && (
          <form onSubmit={handlePay} className="mock-checkout-form">
            <label>
              Customer name
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </label>
            <label>
              Amount (₹)
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label>
              Card number
              <select value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}>
                {TEST_CARDS.map((c) => (
                  <option key={c.number} value={c.number}>{c.number}</option>
                ))}
              </select>
            </label>
            <div className="mock-checkout-legend">
              {TEST_CARDS.find((c) => c.number === cardNumber)?.label}
            </div>
            <button type="submit" className="mock-checkout-pay-btn">Pay ₹{amount || '0'}</button>
            {error && <div className="mock-checkout-error">{error}</div>}
          </form>
        )}

        {stepIndex >= 0 && (
          <div className="mock-checkout-timeline">
            <TimelineRow active={currentStep === 'processing'} done={stepIndex > 0} label="Processing payment..." />
            <TimelineRow
              active={currentStep === 'failed'}
              done={stepIndex > 1}
              label={result ? `Payment failed — ${result.failureReason.replaceAll('_', ' ')}` : 'Payment failed'}
              tone="warn"
            />
            <TimelineRow active={currentStep === 'diagnosing'} done={stepIndex > 2} label="Agent diagnosing failure..." />
            {stepIndex >= 3 && result && (
              <TimelineRow
                active={currentStep === 'decided'}
                done={stepIndex > 3}
                label={`Decision: ${result.decision.actionType} — rules ${result.decision.ruleScore?.toFixed(2)}${result.decision.mlScore !== null ? `, ML ${result.decision.mlScore.toFixed(2)}` : ''}, blended ${result.decision.recoveryScore.toFixed(2)}`}
                detail={result.decision.reasoning}
              />
            )}
            {stepIndex >= 4 && (
              <TimelineRow active={currentStep === 'executing'} done={stepIndex > 4} label={`Executing ${result?.decision.actionType}...`} />
            )}
            {stepIndex >= 5 && result && (
              <TimelineRow
                active
                done
                label={
                  result.executionResult === 'SUCCESS'
                    ? `Payment recovered — ₹${result.amount}`
                    : `Not recovered — ${result.finalStatus}`
                }
                tone={result.executionResult === 'SUCCESS' ? 'success' : 'fail'}
              />
            )}

            {!isRunning && result && (
              <button className="mock-checkout-reset-btn" onClick={reset}>Try another payment</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineRow({ active, done, label, detail, tone }) {
  const stateClass = done ? 'done' : active ? 'active' : 'pending';
  const toneClass = tone ? `tone-${tone}` : '';
  return (
    <div className={`mock-checkout-row ${stateClass} ${toneClass}`}>
      <div className="mock-checkout-dot" />
      <div className="mock-checkout-row-text">
        <div>{label}</div>
        {detail && <div className="mock-checkout-detail">{detail}</div>}
      </div>
    </div>
  );
}
// import { useState, useEffect, useRef } from 'react';
// import { api } from '../api';

// const SCENARIOS = [
//   {
//     id: 'timeout',
//     card: '4111111111111111',
//     label: 'Network Timeout',
//     hint: 'usually recovers',
//   },
//   {
//     id: 'declined',
//     card: '4000000000000002',
//     label: 'Issuer Declined',
//     hint: 'often recovers',
//   },
//   {
//     id: 'funds',
//     card: '4000000000009995',
//     label: 'Insufficient Funds',
//     hint: 'rarely recovers',
//   },
//   {
//     id: 'expired',
//     card: '4000000000000069',
//     label: 'Expired Card',
//     hint: 'needs new payment method',
//   },
//   {
//     id: '3ds',
//     card: '4000000000003220',
//     label: '3DS Auth Failure',
//     hint: 'needs a reminder, not a retry',
//   },
// ];

// const METHODS = [
//   { id: 'card', label: 'Card' },
//   { id: 'upi', label: 'UPI' },
//   { id: 'netbanking', label: 'Netbanking' },
//   { id: 'wallet', label: 'Wallet' },
// ];

// const BANKS = [
//   'HDFC Bank',
//   'ICICI Bank',
//   'State Bank of India',
//   'Axis Bank',
//   'Kotak Mahindra Bank',
// ];

// const WALLETS = [
//   'Paytm',
//   'PhonePe',
//   'Amazon Pay',
//   'Mobikwik',
// ];

// const TIMELINE_STEPS = [
//   'processing',
//   'failed',
//   'diagnosing',
//   'decided',
//   'executing',
//   'result',
// ];

// function randomOrderId() {
//   return `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
// }

// export default function MockCheckout({ onComplete }) {
//   const [method, setMethod] = useState('card');
//   const [scenarioId, setScenarioId] = useState('');

//   const [amount, setAmount] = useState('');
//   const [customerName, setCustomerName] = useState('');
//   const [cardNumber, setCardNumber] = useState('');
//   const [expiry, setExpiry] = useState('');
//   const [cvv, setCvv] = useState('');
//   const [upiId, setUpiId] = useState('');
//   const [bank, setBank] = useState('');
//   const [wallet, setWallet] = useState('');

//   const [stepIndex, setStepIndex] = useState(-1);
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState(null);

//   const orderIdRef = useRef(randomOrderId());

//   const scenario = SCENARIOS.find(
//     (s) => s.id === scenarioId
//   );

//   const currentStep =
//     stepIndex >= 0
//       ? TIMELINE_STEPS[stepIndex]
//       : null;

//   const isFormVisible = stepIndex === -1;

//   async function handlePay(e) {
//     e.preventDefault();

//     setError(null);
//     setResult(null);

//     if (!scenarioId) {
//       setError('Please select a payment failure scenario.');
//       return;
//     }

//     if (!customerName.trim()) {
//       setError('Please enter the customer name.');
//       return;
//     }

//     if (!amount || Number(amount) <= 0) {
//       setError('Please enter a valid amount.');
//       return;
//     }

//     setStepIndex(0);

//     try {
//       const data = await api.simulateDemoPayment({
//         cardNumber: scenario.card,
//         amount,
//         customerName,
//       });

//       setResult(data);
//     } catch (err) {
//       setError(err.message);
//       setStepIndex(-1);
//     }
//   }

//   useEffect(() => {
//     if (!result || stepIndex < 0) return;

//     if (stepIndex >= TIMELINE_STEPS.length - 1) {
//       onComplete?.();
//       return;
//     }

//     const delay = stepIndex === 0 ? 1100 : 1000;

//     const timer = setTimeout(
//       () => setStepIndex((i) => i + 1),
//       delay
//     );

//     return () => clearTimeout(timer);
//   }, [stepIndex, result, onComplete]);

//   function reset() {
//     orderIdRef.current = randomOrderId();

//     setStepIndex(-1);
//     setResult(null);
//     setError(null);
//   }

//   return (
//     <div className="w-full max-w-6xl mx-auto px-8 py-10">

//       {/* Page Header */}
//       <div className="mb-8">
//         <div className="flex items-center justify-between">
//           <div>
//             <h2 className="text-2xl font-semibold text-slate-800">
//               Live Payment Demo
//             </h2>

//             <p className="mt-2 text-sm text-slate-400">
//               Simulate a failed payment and watch the recovery agent respond
//             </p>
//           </div>

//           <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-600">
//             TEST MODE
//           </span>
//         </div>
//       </div>

//       {/* Checkout Card */}
//       <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_2px_15px_rgba(15,23,42,0.05)]">

//         {/* Test Banner */}
//         <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-center">
//           <span className="text-xs font-semibold tracking-wide text-blue-600">
//             ✦ TEST MODE — NO REAL PAYMENT IS PROCESSED ✦
//           </span>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr]">

//           {/* LEFT — Payment Summary */}
//           <div className="p-8 bg-slate-50/70 border-b lg:border-b-0 lg:border-r border-slate-100">

//             <div className="flex items-center gap-3 mb-10">
//               <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-semibold">
//                 D
//               </div>

//               <div>
//                 <div className="font-semibold text-slate-800">
//                   Demo Store
//                 </div>

//                 <div className="text-xs text-slate-400">
//                   demo.store
//                 </div>
//               </div>
//             </div>

//             <div className="mb-8">
//               <div className="text-xs font-semibold tracking-wider text-slate-400">
//                 AMOUNT DUE
//               </div>

//               <div className="mt-2 text-4xl font-semibold text-slate-800">
//                 ₹{amount || '0'}
//               </div>
//             </div>

//             <div className="space-y-4">

//               <div className="flex items-center justify-between py-3 border-b border-slate-200">
//                 <span className="text-sm text-slate-400">
//                   Order
//                 </span>

//                 <span className="text-sm font-mono text-slate-600">
//                   {orderIdRef.current}
//                 </span>
//               </div>

//               <div className="flex items-center justify-between py-3 border-b border-slate-200">
//                 <span className="text-sm text-slate-400">
//                   Customer
//                 </span>

//                 <span className="text-sm text-slate-600">
//                   {customerName || '—'}
//                 </span>
//               </div>

//               <div className="flex items-center justify-between py-3 border-b border-slate-200">
//                 <span className="text-sm text-slate-400">
//                   Scenario
//                 </span>

//                 <span className="text-sm text-slate-600 text-right">
//                   {scenario?.label || '—'}
//                 </span>
//               </div>

//             </div>

//             <div className="mt-8 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200">
//               <span className="w-2 h-2 rounded-full bg-blue-500" />

//               <span className="text-xs font-medium text-slate-500">
//                 Secured Checkout
//               </span>
//             </div>
//           </div>

//           {/* RIGHT — Form / Timeline */}
//           <div className="p-8">

//             {isFormVisible && (
//               <>
//                 {/* Payment Methods */}
//                 <div className="flex gap-1 p-1 mb-8 bg-slate-100 rounded-xl">
//                   {METHODS.map((m) => (
//                     <button
//                       key={m.id}
//                       type="button"
//                       onClick={() => setMethod(m.id)}
//                       className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
//                         method === m.id
//                           ? 'bg-white text-blue-600 shadow-sm'
//                           : 'text-slate-500 hover:text-slate-700'
//                       }`}
//                     >
//                       {m.label}
//                     </button>
//                   ))}
//                 </div>

//                 <form
//                   onSubmit={handlePay}
//                   className="space-y-5"
//                 >

//                   {/* Name + Amount */}
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

//                     <label className="block">
//                       <span className="block mb-2 text-sm font-medium text-slate-600">
//                         Full name
//                       </span>

//                       <input
//                         value={customerName}
//                         onChange={(e) =>
//                           setCustomerName(e.target.value)
//                         }
//                         placeholder="Enter customer name"
//                         required
//                         className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
//                       />
//                     </label>

//                     <label className="block">
//                       <span className="block mb-2 text-sm font-medium text-slate-600">
//                         Amount (₹)
//                       </span>

//                       <input
//                         type="number"
//                         min="1"
//                         value={amount}
//                         onChange={(e) =>
//                           setAmount(e.target.value)
//                         }
//                         placeholder="Enter amount"
//                         required
//                         className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
//                       />
//                     </label>

//                   </div>

//                   {/* CARD */}
//                   {method === 'card' && (
//                     <>
//                       <label className="block">
//                         <span className="block mb-2 text-sm font-medium text-slate-600">
//                           Card number
//                         </span>

//                         <input
//                           value={cardNumber}
//                           onChange={(e) =>
//                             setCardNumber(e.target.value)
//                           }
//                           placeholder="1234 5678 9012 3456"
//                           inputMode="numeric"
//                           className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
//                         />
//                       </label>

//                       <div className="grid grid-cols-2 gap-4">

//                         <label className="block">
//                           <span className="block mb-2 text-sm font-medium text-slate-600">
//                             Expiry date
//                           </span>

//                           <input
//                             value={expiry}
//                             onChange={(e) =>
//                               setExpiry(e.target.value)
//                             }
//                             placeholder="MM/YY"
//                             maxLength={5}
//                             className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
//                           />
//                         </label>

//                         <label className="block">
//                           <span className="block mb-2 text-sm font-medium text-slate-600">
//                             CVV
//                           </span>

//                           <input
//                             type="password"
//                             value={cvv}
//                             onChange={(e) =>
//                               setCvv(e.target.value)
//                             }
//                             placeholder="CVV"
//                             maxLength={3}
//                             inputMode="numeric"
//                             className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
//                           />
//                         </label>

//                       </div>
//                     </>
//                   )}

//                   {/* UPI */}
//                   {method === 'upi' && (
//                     <label className="block">
//                       <span className="block mb-2 text-sm font-medium text-slate-600">
//                         UPI ID
//                       </span>

//                       <input
//                         value={upiId}
//                         onChange={(e) =>
//                           setUpiId(e.target.value)
//                         }
//                         placeholder="yourname@bank"
//                         className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
//                       />
//                     </label>
//                   )}

//                   {/* NETBANKING */}
//                   {method === 'netbanking' && (
//                     <label className="block">
//                       <span className="block mb-2 text-sm font-medium text-slate-600">
//                         Select bank
//                       </span>

//                       <select
//                         value={bank}
//                         onChange={(e) =>
//                           setBank(e.target.value)
//                         }
//                         className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
//                       >
//                         <option value="">
//                           Select your bank
//                         </option>

//                         {BANKS.map((b) => (
//                           <option key={b} value={b}>
//                             {b}
//                           </option>
//                         ))}
//                       </select>
//                     </label>
//                   )}

//                   {/* WALLET */}
//                   {method === 'wallet' && (
//                     <label className="block">
//                       <span className="block mb-2 text-sm font-medium text-slate-600">
//                         Select wallet
//                       </span>

//                       <select
//                         value={wallet}
//                         onChange={(e) =>
//                           setWallet(e.target.value)
//                         }
//                         className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
//                       >
//                         <option value="">
//                           Select your wallet
//                         </option>

//                         {WALLETS.map((w) => (
//                           <option key={w} value={w}>
//                             {w}
//                           </option>
//                         ))}
//                       </select>
//                     </label>
//                   )}

//                   {/* SCENARIO */}
//                   <label className="block">
//                     <span className="block mb-2 text-sm font-medium text-slate-600">
//                       Simulate scenario
//                     </span>

//                     <select
//                       value={scenarioId}
//                       onChange={(e) =>
//                         setScenarioId(e.target.value)
//                       }
//                       required
//                       className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
//                     >
//                       <option value="">
//                         Select a failure scenario
//                       </option>

//                       {SCENARIOS.map((s) => (
//                         <option
//                           key={s.id}
//                           value={s.id}
//                         >
//                           {s.label} — {s.hint}
//                         </option>
//                       ))}
//                     </select>
//                   </label>

//                   {/* Error */}
//                   {error && (
//                     <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
//                       {error}
//                     </div>
//                   )}

//                   {/* Pay Button */}
//                   <button
//                     type="submit"
//                     className="w-full px-5 py-3.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
//                   >
//                     Pay ₹{amount || '0'}
//                   </button>

//                   <div className="text-center text-xs text-slate-400">
//                     🔒 PCI-DSS compliant — simulated for demo purposes
//                   </div>

//                 </form>
//               </>
//             )}

//             {/* PAYMENT TIMELINE */}
//             {!isFormVisible && (
//               <div>

//                 <div className="mb-8">
//                   <h3 className="text-lg font-semibold text-slate-800">
//                     Payment Recovery
//                   </h3>

//                   <p className="mt-1 text-sm text-slate-400">
//                     Watch the recovery agent process this payment
//                   </p>
//                 </div>

//                 {/* Razorpay-style Processing Coin */}
//                 {currentStep === 'processing' && (
//                   <div className="flex flex-col items-center justify-center py-14">

//                     <div className="relative w-24 h-24 mb-7">

//                       {/* Blue pulse */}
//                       <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-30" />

//                       {/* Spinning coin */}
//                       <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_8px_25px_rgba(37,99,235,0.3)] flex items-center justify-center animate-spin">

//                         <div className="w-16 h-16 rounded-full border-2 border-white/40 flex items-center justify-center">
//                           <span className="text-2xl font-semibold text-white">
//                             ₹
//                           </span>
//                         </div>

//                       </div>
//                     </div>

//                     <h3 className="text-lg font-semibold text-slate-800">
//                       Processing payment
//                     </h3>

//                     <p className="mt-2 text-sm text-slate-400">
//                       Securely processing your payment...
//                     </p>

//                     <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
//                       <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />

//                       <span className="text-xs font-medium text-blue-600">
//                         Via{' '}
//                         {
//                           METHODS.find(
//                             (m) => m.id === method
//                           )?.label
//                         }
//                       </span>
//                     </div>

//                   </div>
//                 )}

//                 {/* Failed */}
//                 {stepIndex >= 1 && (
//                   <TimelineRow
//                     active={currentStep === 'failed'}
//                     done={stepIndex > 1}
//                     label={
//                       result
//                         ? `Payment failed — ${result.failureReason.replaceAll('_', ' ')}`
//                         : 'Payment failed'
//                     }
//                     tone="warn"
//                   />
//                 )}

//                 {/* Diagnosing */}
//                 {stepIndex >= 2 && (
//                   <TimelineRow
//                     active={currentStep === 'diagnosing'}
//                     done={stepIndex > 2}
//                     label="Agent diagnosing failure..."
//                   />
//                 )}

//                 {/* Decision */}
//                 {stepIndex >= 3 && result && (
//                   <TimelineRow
//                     active={currentStep === 'decided'}
//                     done={stepIndex > 3}
//                     label={`Decision: ${result.decision.actionType}`}
//                     detail={`Rules ${result.decision.ruleScore?.toFixed(2)}${
//                       result.decision.mlScore !== null
//                         ? ` · ML ${result.decision.mlScore.toFixed(2)}`
//                         : ''
//                     } · Blended ${result.decision.recoveryScore.toFixed(2)}`}
//                   />
//                 )}

//                 {/* Executing */}
//                 {stepIndex >= 4 && (
//                   <TimelineRow
//                     active={currentStep === 'executing'}
//                     done={stepIndex > 4}
//                     label={`Executing ${result?.decision.actionType}...`}
//                   />
//                 )}

//                 {/* Result */}
//                 {stepIndex >= 5 && result && (
//                   <TimelineRow
//                     active
//                     done
//                     label={
//                       result.executionResult === 'SUCCESS'
//                         ? `Payment recovered — ₹${result.amount}`
//                         : `Not recovered — ${result.finalStatus}`
//                     }
//                     tone={
//                       result.executionResult === 'SUCCESS'
//                         ? 'success'
//                         : 'fail'
//                     }
//                   />
//                 )}

//                 {/* Reset */}
//                 {stepIndex >= TIMELINE_STEPS.length - 1 && (
//                   <button
//                     className="mt-8 w-full px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
//                     onClick={reset}
//                   >
//                     Try another payment
//                   </button>
//                 )}

//               </div>
//             )}

//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function TimelineRow({
//   active,
//   done,
//   label,
//   detail,
//   tone,
// }) {
//   const stateClass = done
//     ? 'bg-blue-50 border-blue-100'
//     : active
//     ? 'bg-blue-50/50 border-blue-200'
//     : 'bg-white border-slate-100';

//   const dotClass = done
//     ? 'bg-blue-500'
//     : active
//     ? tone === 'warn'
//       ? 'bg-amber-500'
//       : tone === 'fail'
//       ? 'bg-red-500'
//       : 'bg-blue-600'
//     : 'bg-slate-300';

//   return (
//     <div
//       className={`relative flex gap-4 p-4 mb-3 rounded-xl border ${stateClass}`}
//     >
//       <div className="flex flex-col items-center">
//         <div
//           className={`w-3 h-3 mt-1.5 rounded-full ${dotClass}`}
//         />
//       </div>

//       <div className="flex-1">
//         <div
//           className={`text-sm font-medium ${
//             tone === 'fail'
//               ? 'text-red-600'
//               : tone === 'warn'
//               ? 'text-amber-600'
//               : 'text-blue-600'
//           }`}
//         >
//           {label}
//         </div>

//         {detail && (
//           <div className="mt-1 text-xs text-slate-400 leading-5">
//             {detail}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import './MockCheckout.css';

// Each "scenario" maps to one of the backend's recognized test card numbers
// (server/src/routes/demo.js TEST_CARD_MAP) -- this lets every payment
// method tab (Card/UPI/Netbanking/Wallet) trigger the same real backend
// failure-reason simulation without the backend needing to know which
// tab was used.
const SCENARIOS = [
  { id: 'timeout', card: '4111111111111111', label: 'Card ending 1111', hint: 'typically recovers on retry' },
  { id: 'declined', card: '4000000000000002', label: 'Card ending 0002', hint: 'often recovers on retry' },
  { id: 'funds', card: '4000000000009995', label: 'Card ending 9995', hint: 'rarely recovers via retry' },
  { id: 'expired', card: '4000000000000069', label: 'Card ending 0069', hint: 'needs a new payment method' },
  { id: '3ds', card: '4000000000003220', label: 'Card ending 3220', hint: 'needs a reminder, not a retry' },
];

const METHODS = [
  { id: 'card', label: 'Card' },
  { id: 'upi', label: 'UPI' },
  { id: 'netbanking', label: 'Netbanking' },
  { id: 'wallet', label: 'Wallet' },
];

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'];
const WALLETS = ['Paytm', 'PhonePe', 'Amazon Pay', 'Mobikwik'];

const TIMELINE_STEPS = ['processing', 'failed', 'diagnosing', 'decided', 'executing', 'result'];

function randomOrderId() {
  return `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
}

export default function MockCheckout({ onComplete }) {
  const [method, setMethod] = useState('card');
  const [scenarioId, setScenarioId] = useState('timeout');
  const [amount, setAmount] = useState('4999');
  const [customerName, setCustomerName] = useState('Demo Customer');
  const [cardNumber, setCardNumber] = useState('8794 3787 4787 8578'); // cosmetic only, actual scenario card sent separately
  const [expiry, setExpiry] = useState('12/29');
  const [cvv, setCvv] = useState('123');
  const [upiId, setUpiId] = useState('demo@upi');
  const [bank, setBank] = useState(BANKS[0]);
  const [wallet, setWallet] = useState(WALLETS[0]);

  const [stepIndex, setStepIndex] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const orderIdRef = useRef(randomOrderId());

  const scenario = SCENARIOS.find((s) => s.id === scenarioId);

  async function handlePay(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setStepIndex(0);

    try {
      const data = await api.simulateDemoPayment({
        cardNumber: scenario.card, // maps to the real backend failure-reason scenario
        amount,
        customerName,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
      setStepIndex(-1);
    }
  }

  useEffect(() => {
    if (!result || stepIndex < 0) return;
    if (stepIndex >= TIMELINE_STEPS.length - 1) {
      onComplete?.();
      return;
    }
    const delay = stepIndex === 0 ? 1100 : 1000;
    const timer = setTimeout(() => setStepIndex((i) => i + 1), delay);
    return () => clearTimeout(timer);
  }, [stepIndex, result]);

  function reset() {
    orderIdRef.current = randomOrderId();
    setStepIndex(-1);
    setResult(null);
    setError(null);
  }

  const currentStep = stepIndex >= 0 ? TIMELINE_STEPS[stepIndex] : null;
  const isFormVisible = stepIndex === -1;

  return (
    <div className="checkout-wrapper">
      <div className="checkout-card">
        <div className="checkout-banner">✦ TEST MODE — NO REAL PAYMENT IS PROCESSED ✦</div>

        <div className="checkout-body">
          <div className="checkout-summary">
            <div className="merchant-row">
              <div className="merchant-avatar">D</div>
              <div>
                <div className="merchant-name">Demo Store</div>
                <div className="merchant-domain">demo.store</div>
              </div>
            </div>

            <div className="amount-due-label">AMOUNT DUE</div>
            <div className="amount-due-value">₹{amount || '0'}</div>

            <div className="summary-rows">
              <div className="summary-row">
                <span>Order</span>
                <span>{orderIdRef.current}</span>
              </div>
              <div className="summary-row">
                <span>Customer</span>
                <span>{customerName || '—'}</span>
              </div>
              <div className="summary-row">
                <span>Test card</span>
                <span>{scenario.label}</span>
              </div>
            </div>

            <div className="secured-badge">
              <span className="secured-dot" />
              Secured Checkout
            </div>
          </div>

          <div className="checkout-form-side">
            {isFormVisible && (
              <>
                <div className="method-tabs">
                  {METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`method-tab ${method === m.id ? 'active' : ''}`}
                      onClick={() => setMethod(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handlePay} className="checkout-form">
                  <div className="field-row">
                    <label>
                      Full name
                      <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                    </label>
                    <label>
                      Amount (₹)
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                    </label>
                  </div>

                  {method === 'card' && (
                    <>
                      <label>
                        Card number
                        <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                      </label>
                      <div className="field-row">
                        <label>
                          Expiry date
                          <input value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                        </label>
                        <label>
                          CVV
                          <input value={cvv} onChange={(e) => setCvv(e.target.value)} maxLength={3} type="password" />
                        </label>
                      </div>
                    </>
                  )}

                  {method === 'upi' && (
                    <label>
                      UPI ID
                      <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@bank" />
                    </label>
                  )}

                  {method === 'netbanking' && (
                    <label>
                      Select bank
                      <select value={bank} onChange={(e) => setBank(e.target.value)}>
                        {BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {method === 'wallet' && (
                    <label>
                      Select wallet
                      <select value={wallet} onChange={(e) => setWallet(e.target.value)}>
                        {WALLETS.map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label>
                    Test card
                    <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
                      {SCENARIOS.map((s) => (
                        <option key={s.id} value={s.id}>{s.label} — {s.hint}</option>
                      ))}
                    </select>
                  </label>

                  <button type="submit" className="pay-btn">Pay ₹{amount || '0'}</button>
                  {error && <div className="checkout-error">{error}</div>}
                  <div className="pci-note">🔒 PCI-DSS compliant — simulated for demo purposes</div>
                </form>
              </>
            )}

            {!isFormVisible && (
              <div className="checkout-timeline">
                {currentStep === 'processing' && (
                  <div className="coin-processing">
                    <div className="coin" />
                    <div className="coin-label">Processing payment via {METHODS.find((m) => m.id === method).label}...</div>
                  </div>
                )}

                {stepIndex >= 1 && (
                  <TimelineRow
                    active={currentStep === 'failed'}
                    done={stepIndex > 1}
                    label={result ? `Payment failed — ${result.failureReason.replaceAll('_', ' ')}` : 'Payment failed'}
                    tone="warn"
                  />
                )}
                {stepIndex >= 2 && (
                  <TimelineRow active={currentStep === 'diagnosing'} done={stepIndex > 2} label="Agent diagnosing failure..." />
                )}
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

                {stepIndex >= TIMELINE_STEPS.length - 1 && (
                  <button className="reset-btn" onClick={reset}>Try another payment</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ active, done, label, detail, tone }) {
  const stateClass = done ? 'done' : active ? 'active' : 'pending';
  const toneClass = tone ? `tone-${tone}` : '';
  return (
    <div className={`timeline-row ${stateClass} ${toneClass}`}>
      <div className="timeline-dot" />
      <div className="timeline-text">
        <div>{label}</div>
        {detail && <div className="timeline-detail">{detail}</div>}
      </div>
    </div>
  );
}
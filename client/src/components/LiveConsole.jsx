// import { useState, useEffect, useRef } from 'react';
// import { api } from '../api';
// import './LiveConsole.css';

// const POLL_MS = 900;
// const MAX_LINES = 300;

// function toneFor(result, actionType) {
//   if (result === 'SUCCESS') return 'ok';
//   if (result === 'FAILURE') return 'warn';
//   if (actionType === 'STOP') return 'fail';
//   if (actionType === 'ESCALATE') return 'info';
//   return 'neutral';
// }

// function formatTime(iso) {
//   return new Date(iso).toLocaleTimeString('en-IN', { hour12: true });
// }

// export default function LiveConsole() {
//   const [lines, setLines] = useState([]);
//   const [watching, setWatching] = useState(true);
//   const seenIds = useRef(new Set());
//   const scrollRef = useRef(null);
//   const initializedRef = useRef(false);

//   useEffect(() => {
//     if (!watching) return;

//     async function poll() {
//       try {
//         const actions = await api.getAudit(50); // newest first
//         const fresh = actions.filter((a) => !seenIds.current.has(a.id));

//         if (!initializedRef.current) {
//           // First poll: mark everything currently in the DB as "already
//           // seen" so we don't dump 800 historical lines into the console
//           // the instant it mounts -- only genuinely new decisions print.
//           actions.forEach((a) => seenIds.current.add(a.id));
//           initializedRef.current = true;
//           return;
//         }

//         if (fresh.length === 0) return;

//         // fresh is newest-first; print oldest-first like a real log
//         const ordered = [...fresh].reverse();
//         ordered.forEach((a) => seenIds.current.add(a.id));

//         setLines((prev) => {
//           const next = [...prev, ...ordered];
//           return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
//         });
//       } catch {
//         // silent -- a missed poll just means we catch up next tick
//       }
//     }

//     poll();
//     const interval = setInterval(poll, POLL_MS);
//     return () => clearInterval(interval);
//   }, [watching]);

//   useEffect(() => {
//     if (scrollRef.current) {
//       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
//     }
//   }, [lines]);

//   function clearConsole() {
//     setLines([]);
//   }

//   return (
//     <div className="console-wrapper">
//       <div className="console-titlebar">
//         <div className="console-dots">
//           <span className="dot red" />
//           <span className="dot yellow" />
//           <span className="dot green" />
//         </div>
//         <div className="console-title">agent@vigil — live decision feed</div>
//         <div className="console-controls">
//           <span className={`watch-indicator ${watching ? 'live' : ''}`}>
//             {watching ? '● LIVE' : '○ PAUSED'}
//           </span>
//           <button className="console-btn" onClick={() => setWatching((w) => !w)}>
//             {watching ? 'Pause' : 'Resume'}
//           </button>
//           <button className="console-btn" onClick={clearConsole}>Clear</button>
//         </div>
//       </div>

//       <div className="console-body" ref={scrollRef}>
//         {lines.length === 0 && (
//           <div className="console-empty">
//             $ waiting for agent activity...{'\n'}
//             $ trigger a payment on the Live Demo tab, or click "Run agent on open transactions" on Overview
//           </div>
//         )}
//         {lines.map((a) => (
//           <div key={a.id} className={`console-line tone-${toneFor(a.result, a.actionType)}`}>
//             <span className="console-time">[{formatTime(a.createdAt)}]</span>{' '}
//             <span className="console-tx">TX #{a.transaction?.id ?? a.transactionId}</span>{' '}
//             <span className="console-arrow">→</span>{' '}
//             <span className="console-action">{a.actionType}</span>
//             {a.result && (
//               <>
//                 {' '}<span className="console-arrow">→</span>{' '}
//                 <span className={`console-result tone-${toneFor(a.result, a.actionType)}`}>{a.result}</span>
//               </>
//             )}
//             {a.recoveryScore !== null && a.recoveryScore !== undefined && (
//               <span className="console-score">  score={a.recoveryScore.toFixed(2)}</span>
//             )}
//             {a.mlScore !== null && a.mlScore !== undefined && (
//               <span className="console-score">  ml={a.mlScore.toFixed(2)}</span>
//             )}
//             <div className="console-reasoning">  {a.reasoning}</div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }



import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import './LiveConsole.css';

const POLL_MS = 900;
const MAX_LINES = 300;

function toneFor(result, actionType) {
  if (result === 'SUCCESS') return 'ok';
  if (result === 'FAILURE') return 'warn';
  if (actionType === 'STOP') return 'fail';
  if (actionType === 'ESCALATE') return 'info';
  return 'neutral';
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export default function LiveConsole() {
  const [lines, setLines] = useState([]);
  const [watching, setWatching] = useState(true);

  const seenIds = useRef(new Set());
  const scrollRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!watching) return;

    async function poll() {
      try {
        const actions = await api.getAudit(50);

        const fresh = actions.filter(
          (a) => !seenIds.current.has(a.id)
        );

        if (!initializedRef.current) {
          actions.forEach((a) => seenIds.current.add(a.id));
          initializedRef.current = true;
          return;
        }

        if (fresh.length === 0) return;

        // API returns newest first.
        // Reverse so the console prints oldest → newest.
        const ordered = [...fresh].reverse();

        ordered.forEach((a) => seenIds.current.add(a.id));

        setLines((prev) => {
          const next = [...prev, ...ordered];

          return next.length > MAX_LINES
            ? next.slice(next.length - MAX_LINES)
            : next;
        });
      } catch {
        // Keep polling silently if one request fails.
      }
    }

    poll();

    const interval = setInterval(poll, POLL_MS);

    return () => clearInterval(interval);
  }, [watching]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [lines]);

  function clearConsole() {
    setLines([]);
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-8 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">
            Live Decision Feed
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Real-time agent decisions and recovery activity
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              watching
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                watching
                  ? 'bg-emerald-500'
                  : 'bg-slate-400'
              }`}
            />

            {watching ? 'LIVE' : 'PAUSED'}
          </span>

          <button
            onClick={() => setWatching((w) => !w)}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            {watching ? 'Pause' : 'Resume'}
          </button>

          <button
            onClick={clearConsole}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Console Card */}
      <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05)]">

        {/* Console Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>

          <div className="text-xs font-mono text-slate-500">
            agent@vigil — live decision feed
          </div>

          <div className="text-xs font-mono text-slate-400">
            {lines.length} events
          </div>
        </div>

        {/* Console Body */}
        <div
          ref={scrollRef}
          className="h-[560px] overflow-y-auto bg-slate-950 px-6 py-5 font-mono text-[13px]"
        >
          {lines.length === 0 && (
            <div className="text-slate-500 leading-7">
              <div>$ waiting for agent activity...</div>
              <div>
                $ trigger a payment on the Live Demo tab
              </div>
              <div>
                $ or click "Run agent on open transactions" on Overview
              </div>
            </div>
          )}

          <div className="space-y-3">
            {lines.map((a) => {
              const tone = toneFor(
                a.result,
                a.actionType
              );

              return (
                <div
                  key={a.id}
                  className="border-b border-slate-800/60 pb-3 last:border-0"
                >
                  {/* Main event line */}
                  <div className="flex flex-wrap items-center gap-2 leading-6">

                    <span className="text-slate-500">
                      [{formatTime(a.createdAt)}]
                    </span>

                    <span className="text-slate-600">
                      |
                    </span>

                    <span className="text-slate-400">
                      TX #
                      {a.transaction?.id ??
                        a.transactionId}
                    </span>

                    <span className="text-slate-600">
                      →
                    </span>

                    <span
                      className={
                        tone === 'fail'
                          ? 'text-red-400 font-semibold'
                          : tone === 'info'
                          ? 'text-indigo-400 font-semibold'
                          : tone === 'ok'
                          ? 'text-emerald-400 font-semibold'
                          : tone === 'warn'
                          ? 'text-amber-400 font-semibold'
                          : 'text-slate-300 font-semibold'
                      }
                    >
                      {a.actionType}
                    </span>

                    {a.result && (
                      <>
                        <span className="text-slate-600">
                          →
                        </span>

                        <span
                          className={
                            tone === 'ok'
                              ? 'text-emerald-400 font-semibold'
                              : tone === 'warn'
                              ? 'text-amber-400 font-semibold'
                              : tone === 'fail'
                              ? 'text-red-400 font-semibold'
                              : 'text-slate-400 font-semibold'
                          }
                        >
                          {a.result}
                        </span>
                      </>
                    )}

                    {a.recoveryScore !== null &&
                      a.recoveryScore !== undefined && (
                        <span className="text-slate-500">
                          score=
                          {a.recoveryScore.toFixed(2)}
                        </span>
                      )}

                    {a.mlScore !== null &&
                      a.mlScore !== undefined && (
                        <span className="text-indigo-400">
                          ml=
                          {a.mlScore.toFixed(2)}
                        </span>
                      )}
                  </div>

                  {/* Reasoning */}
                  {a.reasoning && (
                    <div className="mt-1 pl-2 text-slate-500 leading-6">
                      <span className="text-slate-700">
                        └─
                      </span>{' '}
                      {a.reasoning}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom info */}
      <div className="flex items-center justify-between mt-4 px-1">
        <span className="text-xs text-slate-400">
          Polling every {POLL_MS / 1000}s
        </span>

        <span className="text-xs text-slate-400">
          Showing latest {MAX_LINES} events
        </span>
      </div>
    </div>
  );
}
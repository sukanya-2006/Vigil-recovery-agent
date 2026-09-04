# Winback — AI Revenue Recovery Agent
*Don't just lose the sale. Chase it back.*

Built for Razorpay's AI Buildathon — Track 03: AI Revenue Recovery.

Winback is an agent that looks at a batch of failed payments, decides which
ones are worth chasing and how, actually attempts the recovery, and keeps a
complete, readable log of every decision it made and why — including the
ones it chose not to act on.

## The problem, in one sentence

A payment fails, and most businesses either retry it blindly (wasting
effort on hopeless cases) or write it off entirely (losing money that was
genuinely recoverable). Winback tries to tell the difference.

## What it actually does

For every at-risk transaction, Winback runs a loop:

1. **Diagnose** — why did this fail? (issuer decline, expired card, network
   timeout, insufficient funds, failed 3DS authentication, other)
2. **Score (rules)** — combine the failure reason's typical recoverability
   with this specific customer's payment history into a 0–1 recovery score.
3. **Score (ML)** — an independent gradient-boosting classifier, trained on
   this project's own transaction history and served by a separate Python
   microservice, estimates the recovery probability of the specific action
   being considered.
4. **Blend** — the rules score and ML score are combined into a final
   recovery score. If the ML service is unreachable, the engine falls back
   to the rules score alone and logs that fact — a live demo never crashes
   because a Python process isn't running.
5. **Decide** — pick an action: retry, send a reminder, request an updated
   payment method, escalate to a human, or stop. A cost-aware check can
   downgrade a decision to "stop" if attempting it would cost more than
   it's expected to recover.
6. **Execute** — simulate the outcome of that action (no real payment
   gateway is called — see Honest limitations below).
7. **Escalate when uncertain** — if the score is genuinely ambiguous,
   Winback doesn't guess. It routes the case to a human review queue
   instead of auto-acting, and a person can approve or reject it from the
   dashboard.
8. **Message the customer** — for actions that need customer-facing
   follow-up, Winback can generate a plain-language recovery message for
   the transaction directly from the dashboard.
9. **Log everything** — every decision, including stops and rejections and
   which scoring method was used, is written to an audit trail with its
   reasoning attached. The same feed also prints live, in color, to the
   server terminal as it happens.

## Proving it actually works — not just reporting a number

A slice of transactions is deliberately held out as a **control group**
that Winback never touches. Comparing the treatment group's recovery rate
against this untouched baseline is what turns "we recovered ₹X" into "we
recovered ₹X more than would have come back on its own" — the real,
causal contribution of the agent, not just a raw count that could include
payments that would have resolved anyway.

## Architecture

![Architecture diagram](docs/architecture.svg)

React dashboard → Express API → decision engine, which computes a rules
score and makes a live call to the Python ML microservice in parallel,
blends the two, and falls back to rules-only if the ML service is
unreachable. Every decision writes to SQLite via Prisma, which is the
single source of truth all three dashboard tabs read from. The control
group bypasses the agent entirely and is resolved independently, as the
baseline the agent's lift is measured against.

## Tech stack

- **Backend:** Node.js, Express, Prisma ORM, SQLite
- **ML service:** Python, scikit-learn (gradient boosting, calibrated),
  FastAPI, served independently on its own port and called live by the
  decision engine
- **Frontend:** React (Vite)
- **Decision logic:** a blend of hand-tuned rules (for structure,
  reliability, and safety overrides) and a trained ML model (for
  interaction effects the rules table can't express) — see the ML layer
  section below for why it's a blend rather than one or the other

## Project structure

```
winback/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma        # Customer, Transaction, PaymentAttempt, AgentAction
│   │   └── seed.js              # Generates synthetic at-risk transactions
│   └── src/
│       ├── services/
│       │   ├── decisionEngine.js   # Diagnose, rules score, ML call, blend, decide, cost-aware override
│       │   ├── outcomeSimulator.js # Simulates the result of an action
│       │   ├── agent.js            # Orchestrates the batch loop + single-transaction processing
│       │   └── messageGenerator.js # Generates customer-facing recovery messages
│       ├── routes/
│       │   ├── transactions.js  # /summary, /transactions, /audit (read-only)
│       │   ├── agent.js         # /agent/run, /agent/review/:id, /agent/message/:id
│       │   └── demo.js          # /demo/simulate -- powers the live checkout demo
│       └── utils/
│           └── consoleLogger.js # Colored real-time decision logging to the server terminal
├── ml/
│   ├── data/                    # Exported training data (CSV)
│   ├── model/                   # Trained model, metrics, calibration/feature-importance charts
│   ├── train_model.py           # Training + evaluation pipeline
│   ├── serve.py                 # FastAPI service the decision engine calls live
│   └── requirements.txt
├── client/
│   └── src/
│       ├── components/
│       │   ├── Overview.jsx          # Headline numbers + lift
│       │   ├── TransactionsTable.jsx # Full list, filters, approve/reject, message generation
│       │   ├── AuditLog.jsx          # Global decision feed
│       │   └── MockCheckout.jsx      # Live demo: simulated checkout -> real pipeline
│       └── App.jsx
└── docs/
    └── architecture.svg
```

## Running it locally

**1. ML service** (in its own terminal):
```bash
cd ml/model
python -m venv venv
venv\Scripts\Activate.ps1        # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
python train_model.py --data ../data/transactions.csv --out .
uvicorn serve:app --port 8001
```
Leave this running. Check `http://localhost:8001/health`.

**2. Backend** (in a second terminal):
```bash
cd server
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run seed
npm run dev
```
Server runs at `http://localhost:4000`. Check `http://localhost:4000/health`.

**3. Frontend** (in a third terminal):
```bash
cd client
npm install
npm run dev
```
Dashboard runs at `http://localhost:5173`.

Click **"Run agent on open transactions"** on the Overview tab to process
the batch — click it a few times to let in-progress retries resolve. Use
the **"Make your payment"** tab to run a single transaction through the
pipeline live, and the **"Live Console"** tab to watch decisions print in
real time as they're made, from either source.

## Example results

*(Re-run before recording your final numbers — these are illustrative
from development and will not match your final state exactly, since
retries, human-review decisions, and live-demo transactions all change
the dataset as you interact with it.)*

| Metric | Value |
|---|---|
| Recovered by the agent | ₹27,65,101 (359 of 641, 56.0%) |
| Control group (untouched) | ~15.6% recovered organically |
| Agent lift | ~+30 percentage points over doing nothing |
| Model AUC vs. rules-only AUC | see `ml/model/metrics.json` |

## The ML layer, honestly

We didn't want to ship a rules-only engine and call it "AI" just to check
a box — but we also didn't want to overclaim what a same-day ML model
trained on synthetic data actually proves. Here's the honest version:

- The classifier is trained on this project's own generated transaction
  history, not real payment gateway data — a standard, defensible
  approach for a project without production data access, but a real
  limitation worth naming.
- Our model's AUC is notably higher than the rules baseline. This is
  largely because our synthetic outcome simulator is close to
  deterministic given its inputs, so the model is recovering nearly all
  the learnable signal available. We'd expect this gap to narrow against
  noisier, real-world outcomes.
- The rules/ML blend is currently a fixed 50/50 weighting — a reasonable
  starting point, not something we validated against alternatives.
- The ML service is genuinely load-bearing, not decorative: it can and
  does override the rules engine's candidate decision when the two
  scores disagree enough (visible in the audit trail as differing
  `ruleScore` vs. `mlScore` vs. final blended `recoveryScore`).

## Honest limitations

- No real payment gateway is called. "Recovered" means the outcome
  simulator, using the same probability the decision engine computed,
  determined the action would have succeeded. This is a simulation, not
  a live transaction.
- The ML model's strong performance is partly an artifact of a low-noise
  synthetic simulator (see above) — not a claim of production-ready
  calibration.
- The cost-aware override rarely triggers at the current synthetic data's
  amount range — it would matter more for a merchant with many
  very small-ticket transactions.
- The live checkout UI's visual style is inspired by common
  payment-gateway UX conventions (color palette, layout rhythm) for demo
  realism. It is not, and is not intended to represent, any specific
  company's actual product interface.
- No automated test suite — verification during development was manual,
  given the project's time constraints.

## Possible next steps

- Validate the rules/ML blend weight against held-out data instead of a
  fixed 50/50 split.
- Retrain against noisier or partially real-world-sourced outcome data to
  get a more production-honest AUC.
- A live policy simulator: drag a confidence threshold and watch the
  recovery rate / false-positive trade-off change in real time.
- Extend the customer-facing message generator with tone/channel options
  (SMS vs. email vs. WhatsApp).
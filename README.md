# Vigil — AI Revenue Recovery Agent

**Don't just lose the sale. Chase it back.**

Built for Razorpay's AI Buildathon — Track 03: AI Revenue Recovery.

Vigil is an agent that looks at a batch of failed payments, decides which
ones are worth chasing and how, actually attempts the recovery, and keeps a
complete, readable log of every decision it made and why — including the
ones it chose *not* to act on.

## The problem, in one sentence

A payment fails, and most businesses either retry it blindly (wasting effort
on hopeless cases) or write it off entirely (losing money that was
genuinely recoverable). Vigil tries to tell the difference.

## What it actually does

For every at-risk transaction, Vigil runs a loop:

1. **Diagnose** — why did this fail? (issuer decline, expired card, network
   timeout, insufficient funds, failed 3DS authentication, other)
2. **Score** — combine the failure reason's typical recoverability with this
   specific customer's payment history into a 0–1 recovery score.
3. **Decide** — pick an action: retry, send a reminder, request an updated
   payment method, escalate to a human, or stop. A cost-aware check can
   downgrade a decision to "stop" if attempting it would cost more than
   it's expected to recover.
4. **Execute** — simulate the outcome of that action (no real payment
   gateway is called — see [Honest limitations](#honest-limitations) below).
5. **Escalate when uncertain** — if the score is genuinely ambiguous, Vigil
   doesn't guess. It routes the case to a human review queue instead of
   auto-acting, and a person can approve or reject it from the dashboard.
6. **Log everything** — every decision, including stops and rejections,
   is written to an audit trail with its reasoning attached.

## Proving it actually works — not just reporting a number

20% of transactions are deliberately held out as a **control group** that
Vigil never touches. Comparing the treatment group's recovery rate against
this untouched baseline is what turns "we recovered ₹X" into "we recovered
₹X *more than would have come back on its own*" — the real, causal
contribution of the agent, not just a raw count that could include payments
that would have resolved anyway.

## Architecture

![Architecture diagram](docs/architecture.svg)

## Tech stack

- **Backend**: Node.js, Express, Prisma ORM, SQLite
- **Frontend**: React (Vite)
- **No ML framework, no LLM in the decision path** — the recovery score
  and decisions are rules-based, on purpose. See
  [Honest limitations](#honest-limitations).

## Project structure
vigil-recovery-agent/
├── server/
│ ├── prisma/
│ │ ├── schema.prisma # Customer, Transaction, PaymentAttempt, AgentAction
│ │ └── seed.js # Generates 800 synthetic at-risk transactions
│ └── src/
│ ├── services/
│ │ ├── decisionEngine.js # Diagnose, score, decide (+ cost-aware override)
│ │ ├── outcomeSimulator.js # Simulates the result of an action
│ │ └── agent.js # Orchestrates the full batch loop
│ ├── routes/
│ │ ├── transactions.js # /summary, /transactions, /audit (read-only)
│ │ └── agent.js # /agent/run, /agent/review/:id (actions)
│ └── scripts/ # Standalone test/debug scripts
├── client/
│ └── src/
│ ├── components/
│ │ ├── Overview.jsx # Headline numbers + lift
│ │ ├── TransactionsTable.jsx # Full list, filters, approve/reject
│ │ └── AuditLog.jsx # Global decision feed
│ └── App.jsx
└── docs/
└── architecture.svg




## Running it locally

**Backend:**
```bash
cd server
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run seed
npm run dev
```
Server runs at `http://localhost:4000`. Check `http://localhost:4000/health`.

**Frontend** (in a second terminal):
```bash
cd client
npm install
npm run dev
```
Dashboard runs at `http://localhost:5173`. Click **"Run agent on open
transactions"** to process the batch — click it a few times to let
in-progress retries resolve.

## Example results

From a run over 800 synthetic transactions (633 treatment / 167 control):

| Metric | Value |
|---|---|
| Recovered by the agent | ₹29,45,203 (376 of 633, 59.4%) |
| Control group (untouched) | 26 of 167 recovered organically (15.6%) |
| **Agent lift** | **+43.8 percentage points over doing nothing** |
| Pending human review | 188 |
| Written off (not worth pursuing) | 69 |

*(Your own numbers will vary slightly run to run — the underlying data is
seeded deterministically, but retries and human-review decisions change
state as you interact with the dashboard.)*

## Honest limitations

Worth stating plainly rather than letting a reviewer assume otherwise:

- **No real payment gateway is called.** "Recovered" means the outcome
  simulator, using the same probability the decision engine computed,
  determined the action would have succeeded. This is a standard way to
  build this kind of project without production payment access, but it
  is a simulation, not a live transaction.
- **The decision engine is rules-based, not a trained ML model.** Recovery
  scores come from a hand-set table of failure-reason base rates adjusted
  by customer history — not learned from data. This was a deliberate
  choice for reliability within the build timeline.
- **The cost-aware override rarely triggers with the current synthetic
  data's amount range** (₹199–₹15,000) and cost assumptions — recovery
  attempts are almost always worth their modest cost at this scale. It
  would matter more for a merchant with many very small-ticket
  transactions.

## Possible next steps

- Replace the rules-based recovery score with a model trained on real
  (or better-simulated) outcome data, and compare its precision/recall
  against the rules baseline.
- An LLM layer to generate the actual customer-facing reminder message
  and a plain-language explanation of each decision.
- A live policy simulator: drag a confidence threshold and watch the
  recovery rate / false-positive trade-off change in real time.
# RazorGuard — AI Revenue Recovery Agent

**Don't just lose the sale. Chase it back.**

Built for Razorpay's AI Buildathon — Track 03: AI Revenue Recovery.

RazorGuard is an AI-powered revenue recovery system that looks at a batch of failed payments, decides which ones are worth recovering and how, simulates the recovery, and keeps a complete, readable log of every decision it made and why — including the ones it chose *not* to act on.

The core direction of RazorGuard is:

> **Payment Degradation → Root Cause → Recovery Action**

---

## 🚀 Live Demo

**https://razorguard-frontend.onrender.com/**

---

## The Problem, in One Sentence

A payment fails, and most businesses either retry it blindly (wasting effort on hopeless cases) or write it off entirely (losing money that was genuinely recoverable). RazorGuard tries to tell the difference.

---

## What It Actually Does

For every at-risk transaction, RazorGuard runs a recovery loop:

1. **Diagnose** — identify why the payment failed (issuer decline, expired card, network timeout, insufficient funds, failed 3DS authentication, or other).

2. **Score (rules)** — combine the failure reason's typical recoverability with this specific customer's payment history into a 0–1 recovery score.

3. **Score (ML)** — an independent gradient-boosting classifier, trained on this project's transaction history and served by a separate Python microservice, estimates the recovery probability of the specific transaction.

4. **Blend** — the rules score and ML score are combined into a final recovery score. If the ML service is unreachable, the engine falls back to the rules score alone and logs that fact.

5. **Decide** — select an action such as retry, send a reminder, request an updated payment method, escalate to a human, or stop. A cost-aware check can downgrade a decision to "stop" if attempting it would cost more than it is expected to recover.

6. **Execute** — simulate the outcome of that recovery action. No real payment gateway is called.

7. **Escalate when uncertain** — if the score is genuinely ambiguous, RazorGuard can route the case for human review instead of blindly auto-acting.

8. **Customer outreach** — for transactions that benefit from customer-facing communication, RazorGuard can generate a personalized recovery message. It also includes a lightweight **Hinglish Recovery** feature that generates a localized payment-recovery message which can be previewed in a WhatsApp, SMS, or voice-call style.

9. **Log everything** — every decision, including stops and human-review decisions, is written to an audit trail with its reasoning and scoring information attached.

---

## How to Actually Use It — A Walkthrough

If you're opening the dashboard for the first time, here's what each tab is for and what to actually click:

- **Overview** — your one-glance summary: total recovered, recovery rate, and current transaction status. Click **"Run agent on open transactions"** to process the available open transactions.

- **Transactions** — the full list of transactions and their current status. This is where you can inspect individual recovery decisions and open the **Hinglish Recovery** feature for customer-facing communication.

- **Audit Log** — a timestamped feed of recovery decisions and actions, with the reasoning and rules/ML/blended scores shown for each one.

- **Make a Payment** — a simulated checkout. Submit a test amount and scenario and watch the payment failure → diagnosis → scoring → decision → outcome pipeline run live.

The dashboard intentionally focuses on these four screens:

```text
Overview
Transactions
Audit Log
Make a Payment
```

---

## Proving It Actually Works — Not Just Reporting a Number

A slice of transactions is deliberately held out as a **control group** that RazorGuard never touches.

Comparing the treatment group's recovery rate against this untouched baseline helps distinguish:

> "We recovered ₹X"

from:

> "We recovered ₹X *more than would have come back on its own*"

This provides a more meaningful view of the agent's contribution instead of simply counting all recovered payments.

---

## Architecture

![Architecture diagram](docs/architecture.svg)

React dashboard → Express API → decision engine, which computes a rules score and makes a live call to the Python ML microservice, blends the two, and falls back to rules-only if the ML service is unreachable.

Every decision writes to SQLite via Prisma, the single source of truth used by the dashboard.

The control group bypasses the agent entirely and is resolved independently as the baseline used to measure recovery lift.

The optional Hinglish Recovery feature sits on top of the recovery workflow and uses the Groq API to generate a localized customer-facing message.

---

## Tech Stack

- **Backend:** Node.js, Express, Prisma ORM, SQLite
- **ML service:** Python, scikit-learn (gradient boosting, calibrated), FastAPI — served independently and called live by the decision engine
- **Frontend:** React (Vite), Tailwind CSS
- **Generative AI:** Groq API with Qwen for short Hinglish recovery-message generation
- **Decision logic:** a blend of hand-tuned rules (structure, reliability, safety overrides) and a trained ML model
- **Deployment:** Render

---

## Project Structure

```text
razorguard/
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma        # Customer, Transaction, PaymentAttempt, AgentAction
│   │   └── seed.js              # Generates synthetic at-risk transactions
│   │
│   └── src/
│       ├── services/
│       │   ├── decisionEngine.js        # Diagnose, rules score, ML call, blend, decide
│       │   ├── outcomeSimulator.js      # Simulates the result of an action
│       │   ├── agent.js                 # Orchestrates batch + transaction processing
│       │   ├── messageGenerator.js      # Plain-language customer recovery messages
│       │   └── hinglishRecoveryAgent.js # Hinglish recovery-message generation via Groq
│       │
│       ├── routes/
│       │   ├── transactions.js  # Transaction, summary and audit endpoints
│       │   ├── agent.js         # Agent, review and customer-outreach endpoints
│       │   └── demo.js          # /demo/simulate -- powers the checkout demo
│       │
│       └── index.js
│
├── ml/
│   ├── data/                    # Training data (CSV)
│   └── model/
│       ├── train_model.py       # Training + evaluation pipeline
│       ├── serve.py             # FastAPI service called by the backend
│       ├── model.joblib         # Trained model
│       └── requirements.txt
│
├── client/
│   └── src/
│       ├── components/
│       │   ├── Overview.jsx            # Headline numbers + recovery statistics
│       │   ├── TransactionsTable.jsx  # Transaction list + recovery actions
│       │   ├── AuditLog.jsx           # Global decision feed
│       │   ├── MockCheckout.jsx        # Simulated checkout → recovery pipeline
│       │   └── RecoveryOutreachModal.jsx # Hinglish recovery communication
│       │
│       └── App.jsx
│
├── docs/
│   └── architecture.svg
│
└── README.md
```

---

## Running it locally

### 1. ML service

Open its own terminal:

```bash
cd ml/model
python -m venv venv
venv\Scripts\Activate.ps1
```

On macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

If you need to train the model:

```bash
python train_model.py --data ../data/transactions.csv --out .
```

Start the ML service:

```bash
uvicorn serve:app --port 8001
```

Leave this running.

Check:

```text
http://localhost:8001/health
```

---

### 2. Backend

Open a second terminal:

```bash
cd server
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, if `cp` is unavailable, copy the file manually:

```powershell
Copy-Item .env.example .env
```

Configure the required environment variables:

```env
DATABASE_URL=file:./dev.db

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=qwen/qwen3.6-27b

ML_SERVICE_URL=http://localhost:8001
```

Run Prisma:

```bash
npx prisma migrate dev --name init
```

Seed the demo database:

```bash
npm run seed
```

Start the backend:

```bash
npm run dev
```

Server runs at:

```text
http://localhost:4000
```

Check:

```text
http://localhost:4000/health
```

---

### 3. Frontend

Open a third terminal:

```bash
cd client
npm install
npm run dev
```

Dashboard runs at:

```text
http://localhost:5173
```

---

## Demo Flow

A simple demonstration of RazorGuard can follow this flow:

```text
1. Open Make a Payment
          ↓
2. Choose a test payment scenario
          ↓
3. Submit the simulated payment
          ↓
4. Payment fails
          ↓
5. RazorGuard diagnoses the failure
          ↓
6. Rules + ML calculate recovery probability
          ↓
7. Recovery action is selected
          ↓
8. Recovery outcome is simulated
          ↓
9. View the updated transaction
          ↓
10. Open Hinglish Recovery if customer outreach is useful
          ↓
11. Generate a personalized Hinglish message
          ↓
12. View the decision in Audit Log
```

The **Hinglish Recovery** feature is intentionally small. It demonstrates localized customer communication without turning RazorGuard into a separate communication platform.

---

## Hinglish Recovery

RazorGuard includes a lightweight Hinglish recovery feature for customer-facing communication.

For a failed transaction, the system uses transaction context such as:

- Customer name
- Payment amount
- Failure reason
- Previous attempts
- Recovery context

to generate a short Hinglish message.

Example:

```text
Hi Aditya ji, aapka last payment card expiry ki wajah
se complete nahi ho paya. Koi tension nahi hai.
Aap updated card ke saath payment retry kar sakte hain.
Agar help chahiye toh reply YES karein.
```

The generated communication can be viewed as:

```text
WhatsApp-style message
SMS-style message
Voice-call script
```

This is a **supporting feature**, not a full autonomous voice or messaging agent.

The current implementation is for demonstration:

- No real WhatsApp message is sent.
- No real SMS is sent.
- No real phone call is placed.
- The generated text is a preview/demo communication.

A production version could connect the same recovery workflow to a real messaging or voice provider after appropriate customer approval and infrastructure are added.

---

## Example Recovery Decisions

### Network Timeout

```text
Failure
   ↓
NETWORK_TIMEOUT
   ↓
High recovery probability
   ↓
RETRY
   ↓
Simulated retry
   ↓
Recovered
```

### Expired Card

```text
Failure
   ↓
EXPIRED_CARD
   ↓
Low probability of successful retry
   ↓
UPDATE_METHOD
   ↓
Customer needs a new payment method
```

### Insufficient Funds

```text
Failure
   ↓
INSUFFICIENT_FUNDS
   ↓
Moderate recovery probability
   ↓
REMINDER / appropriate recovery action
   ↓
Customer can retry later
```

The objective is to select a recovery strategy based on the characteristics of the failure instead of applying the same action to every failed payment.

---

## Example Results

*(Re-run before recording your final numbers — these values can change as the seeded dataset and demo transactions change.)*

| Metric | Value |
|---|---|
| Recovered by the agent | See live dashboard |
| Control group recovery | See live dashboard |
| Agent lift | See live dashboard |
| Model AUC vs. rules-only AUC | See `ml/model/metrics.json` |

---

## The ML Layer, Honestly

We didn't want to ship a rules-only engine and call it "AI" just to check a box — but we also don't want to overclaim what a model trained on synthetic data actually proves.

Here's the honest version:

- The classifier is trained on this project's generated transaction history, not production payment-gateway data.
- This is a reasonable approach for a prototype without access to production payment data, but it is a real limitation.
- The rules/ML blend is used to combine predictive scoring with deterministic business constraints.
- The ML service is genuinely part of the decision pipeline rather than being included only for display.
- The audit trail exposes the rules score, ML score, and final recovery score so the decision can be inspected.

---

## Honest Limitations

- **No real payment gateway is called.** "Recovered" means the outcome simulator determined that the selected recovery action succeeded. It is a simulation, not a live transaction.

- **The ML model is trained on synthetic/project-generated data.** Strong performance on this dataset should not be interpreted as production-ready performance.

- **The rules/ML blend is a prototype.** The current weighting is a practical starting point rather than a production-validated policy.

- **Customer-facing messages are simulated.** The Hinglish feature generates and previews communication, but does not automatically send WhatsApp/SMS messages or place phone calls.

- **The voice feature is a demonstration script.** It does not currently implement a real-time telephone conversation.

- **The checkout UI is simulated.** It is intended to demonstrate the recovery pipeline and is not a representation of a real payment gateway interface.

- **SQLite is used for the prototype.** A production deployment would require a persistent production-grade database.

- **No automated test suite is currently included.** Verification during development was primarily manual.

---

## Possible Next Steps

Potential improvements include:

- Validate the rules/ML blend weight against held-out data instead of using a fixed weighting.
- Retrain against noisier or real-world outcome data.
- Add a live policy simulator for recovery thresholds and false-positive trade-offs.
- Add more customer-level recovery strategies.
- Add real payment gateway integration.
- Add real WhatsApp/SMS integration after human approval.
- Add text-to-speech and real voice-provider integration.
- Add customer communication preferences.
- Extend the system to subscription recovery, mandate recovery, checkout drop-off, B2B receivables, or promise-to-pay workflows.

These are **future extensions**, not claims about the current implementation.

---

## 🎯 Project Direction

RazorGuard intentionally focuses on one primary direction:

> **Payment Degradation → Root Cause → Recovery Action**

The other revenue-recovery directions are potential future extensions rather than separate features that the current project attempts to implement.

The **Hinglish Recovery** feature is a small supporting layer that demonstrates how an existing recovery decision can be translated into localized customer communication.

The core system remains:

```text
Payment Failure
      ↓
Root Cause
      ↓
Rules + ML
      ↓
Recovery Decision
      ↓
Recovery Outcome
      ↓
Audit Trail
```

---

## Why RazorGuard?

Most payment-recovery systems can answer:

> "Did the payment fail?"

RazorGuard tries to answer the more useful question:

> **"Why did it fail, is it worth recovering, and what should we do next?"**

That is the core idea behind RazorGuard.

---

## Built For

**Razorpay AI Buildathon — Track 03: AI Revenue Recovery**

RazorGuard demonstrates how machine learning, business rules, generative AI, and an auditable decision system can work together to reduce revenue loss from failed payments.

> **Don't just identify a failed payment. Decide what should happen next.**

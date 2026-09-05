# RazorGuard — AI Revenue Recovery Agent

> **Don't just lose the sale. Chase it back.**

Built for **Razorpay's AI Buildathon — Track 03: AI Revenue Recovery**.

RazorGuard is an AI-powered revenue recovery agent that looks at failed payments, decides which ones are worth chasing and how, attempts recovery, and maintains a complete audit trail explaining every decision — including the cases where it chooses **not** to act.

## 🚀 Live Demo

**https://razorguard-frontend.onrender.com/**

---

## 🎯 The Problem

A payment fails, and businesses often either:

- Retry blindly, wasting effort on unlikely recoveries
- Write the payment off entirely, losing revenue that could have been recovered

**RazorGuard tries to tell the difference.**

---

## 🤖 What RazorGuard Does

For every at-risk transaction, RazorGuard runs a recovery loop:

### 1. Diagnose

Identify why the payment failed:

- Issuer declined
- Expired card
- Network timeout
- Insufficient funds
- Failed 3DS authentication
- Other

### 2. Score — Rules Engine

A rules-based score combines the typical recoverability of the failure reason with transaction/customer information to estimate the recovery probability.

### 3. Score — ML Model

An independent gradient-boosting classifier, trained on this project's transaction history, estimates the recovery probability of the action being considered.

The model is served through a separate **Python/FastAPI microservice**.

### 4. Blend

The rules score and ML score are combined into a final recovery score.

If the ML service is temporarily unavailable, RazorGuard falls back to the rules score so that the recovery workflow can continue.

### 5. Decide

The agent chooses the most appropriate action:

- **Retry**
- **Reminder**
- **Update payment method**
- **Escalate to human**
- **Stop / No Action**

A cost-aware check can also stop an action when the expected recovery value is lower than the cost of attempting it.

### 6. Execute

The selected recovery action is executed through the project's outcome simulator.

> No real payment gateway is called. See [Honest Limitations](#honest-limitations).

### 7. Escalate When Uncertain

If the recovery score is ambiguous, RazorGuard does not blindly act.

Instead, the transaction can be routed to a **human review queue**, where a reviewer can approve or reject the proposed action.

### 8. Draft Customer Outreach

For actions requiring customer follow-up, RazorGuard can generate:

- Plain-language recovery messages
- Warm Hinglish payment-plan offer scripts

These are drafts for human approval and are **not automatically sent**.

### 9. Log Everything

Every agent decision is recorded in an audit trail with:

- Decision
- Recovery score
- Rules score
- ML score
- Scoring method
- Outcome
- Reasoning

The same decisions can also be displayed in the live console.

---

# 🖥️ Dashboard Walkthrough

RazorGuard contains five main sections.

### Overview

Provides a one-glance summary of:

- Total recovered revenue
- Agent recovery rate
- Control-group recovery rate
- Causal lift over the baseline
- Transactions still retrying
- Transactions awaiting human review
- Written-off transactions

Use **"Run agent on open transactions"** to process the current batch.

### Transactions

Displays the complete transaction list.

Transactions can be filtered by:

- Treatment / Control group
- Status

This section also allows human reviewers to:

- Approve or reject pending decisions
- Generate customer recovery messages
- Generate Hinglish recovery offers

### Audit Log

A timestamped feed of agent decisions and their outcomes.

Each entry includes the reasoning behind the decision and the rules/ML/blended scores used.

### Make a Payment

A simulated checkout designed for demonstrating the complete recovery pipeline.

You can create a test payment and watch the flow:

```text
Payment Attempt
      ↓
Payment Failure
      ↓
Diagnosis
      ↓
Recovery Scoring
      ↓
Agent Decision
      ↓
Recovery Execution
      ↓
Outcome

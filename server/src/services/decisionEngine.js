const { FAILURE_REASON, ACTION_TYPE } = require('../constants');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

// Base recovery probability per failure reason, before adjusting for the
// specific customer. These numbers are assumptions encoded from how these
// failure types actually behave in card payments -- a network timeout is
// almost always transient (retry works most of the time); an expired card
// will never succeed no matter how many times you retry it.
const BASE_RECOVERY_RATE = {
  [FAILURE_REASON.NETWORK_TIMEOUT]: 0.85,
  [FAILURE_REASON.ISSUER_DECLINED]: 0.65,
  [FAILURE_REASON.INSUFFICIENT_FUNDS]: 0.45,
  [FAILURE_REASON.THREE_DS_FAILURE]: 0.4,
  [FAILURE_REASON.OTHER]: 0.25,
  [FAILURE_REASON.EXPIRED_CARD]: 0.05, // essentially never recoverable via retry
};

// Rough relative cost per action -- not real money, just enough to rank
// actions against each other. A retry costs almost nothing (a gateway
// call); escalating to a human costs the most (someone's time).
const ACTION_COST = {
  [ACTION_TYPE.RETRY]: 5,
  [ACTION_TYPE.REMINDER]: 10,
  [ACTION_TYPE.UPDATE_METHOD]: 15,
  [ACTION_TYPE.ESCALATE]: 50,
  [ACTION_TYPE.STOP]: 0,
  [ACTION_TYPE.NO_ACTION]: 0,
};

const MAX_RETRIES = 2;
const HIGH_CONFIDENCE = 0.65;
const LOW_CONFIDENCE = 0.35;
const ML_BLEND_WEIGHT = 0.5; // how much the ML score counts vs the rules score

/**
 * Computes a 0-1 recovery score for a transaction, blending the failure
 * reason's base rate with this specific customer's reliability.
 */
function computeRecoveryScore(transaction) {
  const base = BASE_RECOVERY_RATE[transaction.failureReason] ?? 0.25;

  const { successfulPayments, failedPayments } = transaction.customer;
  // +1 in the denominator avoids dividing by zero for brand-new customers,
  // and pulls their reliability toward 0.5 (neutral) until they have history.
  const reliability = successfulPayments / (successfulPayments + failedPayments + 1);

  // Blend: reliability can only pull the score up or down by at most 20
  // points either way. We don't want a very reliable customer to fully
  // erase an EXPIRED_CARD's near-zero base rate -- reliability should
  // matter, but the failure type should still dominate.
  const adjustment = (reliability - 0.5) * 0.4;
  const score = base + adjustment;

  return Math.max(0, Math.min(1, score));
}

/**
 * Asks the ML microservice how likely a specific candidate action is to
 * recover this transaction. Returns null (never throws) if the service is
 * unavailable, so the rules-based score can always be used as a fallback --
 * this is what keeps a live demo from crashing if the Python service isn't
 * running.
 */
async function getMlScore(transaction, candidateActionType) {
  const customer = transaction.customer;
  const totalPayments = (customer.successfulPayments ?? 0) + (customer.failedPayments ?? 0);
  const customerSuccessRate = totalPayments > 0 ? customer.successfulPayments / totalPayments : 0;
  const customerDaysSinceSignup = Math.round((Date.now() - new Date(customer.createdAt)) / 864e5);
  const hoursSinceCreated = Math.round((Date.now() - new Date(transaction.createdAt)) / 36e5);

  try {
    const res = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Short timeout keeps a stalled ML service from stalling a decision
      signal: AbortSignal.timeout(400),
      body: JSON.stringify({
        amount: transaction.amount,
        currency: transaction.currency,
        failureReason: transaction.failureReason,
        actionType: candidateActionType,
        retryCount: transaction.retryCount,
        hoursSinceCreated,
        customerSuccessfulPayments: customer.successfulPayments ?? 0,
        customerFailedPayments: customer.failedPayments ?? 0,
        customerSuccessRate,
        customerDaysSinceSignup,
      }),
    });
    if (!res.ok) throw new Error(`ML service ${res.status}`);
    const { recoveryProbability } = await res.json();
    return recoveryProbability;
  } catch (err) {
    console.warn("[decisionEngine] ML service unavailable, using rules score only:", err.message);
    return null;
  }
}

/**
 * Runs the rules-based decision logic for a given score, returning the
 * action + reasoning it implies. Pulled out into its own function so it can
 * be run twice: once with the rules-only score (to get a candidate action
 * to ask the ML service about), and once with the final blended score (to
 * confirm/finalize the decision).
 */
function decideFromScore(transaction, recoveryScore) {
  const { failureReason, retryCount } = transaction;
  let actionType;
  let reasoning;

  if (failureReason === FAILURE_REASON.EXPIRED_CARD) {
    actionType = ACTION_TYPE.UPDATE_METHOD;
    reasoning = `Card is expired -- retrying cannot succeed regardless of score (${recoveryScore.toFixed(2)}). Requesting an updated payment method instead.`;
  } else if (failureReason === FAILURE_REASON.THREE_DS_FAILURE && recoveryScore >= LOW_CONFIDENCE) {
    actionType = ACTION_TYPE.REMINDER;
    reasoning = `Authentication step was not completed. A reminder nudging the customer to finish 3DS verification is more likely to help than a blind retry (score ${recoveryScore.toFixed(2)}).`;
  } else if (retryCount >= MAX_RETRIES) {
    actionType = ACTION_TYPE.STOP;
    reasoning = `Retry limit of ${MAX_RETRIES} reached for this transaction. Stopping rather than retrying indefinitely.`;
  } else if (recoveryScore >= HIGH_CONFIDENCE) {
    actionType = ACTION_TYPE.RETRY;
    reasoning = `Recovery score ${recoveryScore.toFixed(2)} is high confidence. Retrying.`;
  } else if (recoveryScore >= LOW_CONFIDENCE) {
    actionType = ACTION_TYPE.ESCALATE;
    reasoning = `Recovery score ${recoveryScore.toFixed(2)} falls in the uncertain middle band -- not confident enough to auto-act. Routing to human review instead of guessing.`;
  } else {
    actionType = ACTION_TYPE.STOP;
    reasoning = `Recovery score ${recoveryScore.toFixed(2)} is too low to justify intervening. Stopping to avoid wasting a retry/reminder on an unlikely outcome.`;
  }

  return { actionType, reasoning };
}

/**
 * The main entry point: given a transaction (with its customer preloaded),
 * returns { recoveryScore, actionType, reasoning, expectedValue }.
 *
 * NOTE: this is now async (it calls the ML service). Every call site must
 * be updated to `await diagnoseAndDecide(transaction)`.
 */
async function diagnoseAndDecide(transaction) {
  const ruleScore = computeRecoveryScore(transaction);

  // Pass 1: rules-only decision, just to get a candidate action to ask the
  // ML service about.
  const candidate = decideFromScore(transaction, ruleScore);

  // Ask the ML service how likely THIS candidate action is to work.
  const mlScore = await getMlScore(transaction, candidate.actionType);

  const scoringMethod = mlScore !== null ? "blended" : "rules_fallback";
  const recoveryScore = mlScore !== null
    ? (1 - ML_BLEND_WEIGHT) * ruleScore + ML_BLEND_WEIGHT * mlScore
    : ruleScore;

  // Pass 2: re-run the decision with the blended score. Most of the time
  // this agrees with the candidate action, but a large rules/ML
  // disagreement can flip it (e.g. rules said RETRY at 0.66, ML thinks
  // it's actually closer to 0.30, blended score drops into ESCALATE band).
  const { actionType, reasoning: baseReasoning } = decideFromScore(transaction, recoveryScore);

  const reasoning = mlScore !== null
    ? `${baseReasoning} [rules score ${ruleScore.toFixed(2)}, ML score ${mlScore.toFixed(2)}, blended ${recoveryScore.toFixed(2)}]`
    : `${baseReasoning} [rules score only -- ML service unavailable]`;

  let cost = ACTION_COST[actionType] ?? 0;
  let expectedValue = recoveryScore * transaction.amount - cost;

  // Cost-aware override: a confident decision can still be a bad one if
  // what it costs to attempt (gateway fees, customer annoyance, a human
  // reviewer's time) outweighs what it's expected to recover.
  const costSensitiveActions = [ACTION_TYPE.RETRY, ACTION_TYPE.REMINDER, ACTION_TYPE.ESCALATE];
  let finalActionType = actionType;
  let finalReasoning = reasoning;
  if (costSensitiveActions.includes(actionType) && expectedValue <= 0) {
    finalReasoning = `Cost-aware override: the original decision was ${actionType}, but its expected value (score ${recoveryScore.toFixed(2)} × ₹${transaction.amount} − cost ₹${cost} = ₹${expectedValue.toFixed(0)}) is not positive. Stopping instead of spending effort on a net-negative outcome.`;
    finalActionType = ACTION_TYPE.STOP;
    cost = 0;
    expectedValue = 0;
  }

  return {
    recoveryScore,
    ruleScore,
    mlScore,          // null if the ML service was down -- keep this in the audit log
    scoringMethod,
    actionType: finalActionType,
    reasoning: finalReasoning,
    expectedValue,
  };
}

function decideApprovedAction(transaction) {
  if (transaction.failureReason === FAILURE_REASON.EXPIRED_CARD) return ACTION_TYPE.UPDATE_METHOD;
  if (transaction.failureReason === FAILURE_REASON.THREE_DS_FAILURE) return ACTION_TYPE.REMINDER;
  return ACTION_TYPE.RETRY;
}

module.exports = { diagnoseAndDecide, computeRecoveryScore, decideApprovedAction };
const { FAILURE_REASON, ACTION_TYPE } = require('../constants');

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
 * The main entry point: given a transaction (with its customer preloaded),
 * returns { recoveryScore, actionType, reasoning, expectedValue }.
 */
function diagnoseAndDecide(transaction) {
  const recoveryScore = computeRecoveryScore(transaction);
  const { failureReason, retryCount, amount, customer } = transaction;

  let actionType;
  let reasoning;

  // Two failure reasons override the score entirely, because no score
  // should talk the agent into an action that structurally cannot work
  // (retrying an expired card) or into skipping the one action that
  // actually addresses the real problem (nudging a stuck 3DS auth).
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
    reasoning = `Recovery score ${recoveryScore.toFixed(2)} is high confidence (customer has ${customer.successfulPayments}/${customer.successfulPayments + customer.failedPayments} successful past payments, failure reason ${failureReason} is usually transient). Retrying.`;
  } else if (recoveryScore >= LOW_CONFIDENCE) {
    actionType = ACTION_TYPE.ESCALATE;
    reasoning = `Recovery score ${recoveryScore.toFixed(2)} falls in the uncertain middle band -- not confident enough to auto-act. Routing to human review instead of guessing.`;
  } else {
    actionType = ACTION_TYPE.STOP;
    reasoning = `Recovery score ${recoveryScore.toFixed(2)} is too low to justify intervening. Stopping to avoid wasting a retry/reminder on an unlikely outcome.`;
  }

  const cost = ACTION_COST[actionType] ?? 0;
  const expectedValue = recoveryScore * amount - cost;

  return { recoveryScore, actionType, reasoning, expectedValue };
}
function decideApprovedAction(transaction) {
  if (transaction.failureReason === FAILURE_REASON.EXPIRED_CARD) return ACTION_TYPE.UPDATE_METHOD;
  if (transaction.failureReason === FAILURE_REASON.THREE_DS_FAILURE) return ACTION_TYPE.REMINDER;
  return ACTION_TYPE.RETRY;
}

module.exports = { diagnoseAndDecide, computeRecoveryScore, decideApprovedAction };
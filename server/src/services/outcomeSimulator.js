const { ACTION_TYPE } = require('../constants');

// Same seeded-PRNG approach as prisma/seed.js, but seeded per-transaction-id
// rather than once globally. This means: run the agent over the same batch
// twice, and transaction #47 gets the exact same simulated outcome both
// times. That reproducibility matters for demoing consistent numbers and
// for being able to say "we re-ran this and got the same result."
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForTransaction(transactionId, attemptSeed = 0) {
  return mulberry32(transactionId * 7919 + attemptSeed * 104729 + 13);

  // Multiplying by a prime spreads out consecutive transaction IDs so they
  // don't produce visually-correlated random sequences.
  return mulberry32(transactionId * 7919 + 13);
}

const UPDATE_METHOD_SUCCESS_RATE = 0.7;
// Baseline chance a control-group (untouched) transaction resolves on its
// own -- customer retries themselves, bank clears the temporary block, etc.
// This is the number that makes the treatment-vs-control "lift" comparison
// meaningful: if this were 0, every treatment recovery would look like the
// agent's doing, which wouldn't be honest.
const ORGANIC_RECOVERY_RATE = 0.15;

/**
 * Executes a chosen action against a transaction and returns whether it
 * succeeded. For RETRY/REMINDER we treat the decision engine's recovery
 * score as the true probability of success -- a standard simplification
 * for a synthetic simulation where there's no real payment gateway to
 * call. ESCALATE has no automatic outcome (a human resolves it later);
 * STOP has no outcome at all (we're not attempting anything).
 */
function simulateExecution(transaction, actionType, recoveryScore) {
 const rng = rngForTransaction(transaction.id, transaction.retryCount);

  switch (actionType) {
    case ACTION_TYPE.RETRY:
    case ACTION_TYPE.REMINDER:
      return rng() < recoveryScore ? 'SUCCESS' : 'FAILURE';
    case ACTION_TYPE.UPDATE_METHOD:
      return rng() < UPDATE_METHOD_SUCCESS_RATE ? 'SUCCESS' : 'FAILURE';
    case ACTION_TYPE.ESCALATE:
      return 'PENDING';
    case ACTION_TYPE.STOP:
    case ACTION_TYPE.NO_ACTION:
    default:
      return null;
  }
}

/**
 * For control-group transactions the agent never touches: did this
 * transaction resolve itself anyway? This is the baseline we subtract
 * from the treatment group's recovery rate to get the agent's true lift.
 */
function simulateOrganicRecovery(transaction) {
  const rng = rngForTransaction(transaction.id);
  return rng() < ORGANIC_RECOVERY_RATE;
}

module.exports = { simulateExecution, simulateOrganicRecovery };
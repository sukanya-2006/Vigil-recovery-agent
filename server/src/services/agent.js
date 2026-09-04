// const { diagnoseAndDecide } = require('./decisionEngine');
// const { simulateExecution, simulateOrganicRecovery } = require('./outcomeSimulator');
// const { TRANSACTION_STATUS, ACTION_TYPE } = require('../constants');

// async function runAgentBatch(prisma) {
//   const openTransactions = await prisma.transaction.findMany({
//     where: {
//       isControlGroup: false,
//       status: { in: [TRANSACTION_STATUS.FAILED, TRANSACTION_STATUS.RECOVERING] },
//     },
//     include: { customer: true },
//   });

//   const results = [];

//   for (const tx of openTransactions) {
//     const decision = await diagnoseAndDecide(tx); // now async -- calls the ML service internally
//     const executionResult = simulateExecution(tx, decision.actionType, decision.recoveryScore);

//     let newStatus = tx.status;
//     let retryIncrement = 0;

//     if (decision.actionType === ACTION_TYPE.RETRY || decision.actionType === ACTION_TYPE.REMINDER) {
//       retryIncrement = 1;
//       newStatus = executionResult === 'SUCCESS' ? TRANSACTION_STATUS.RECOVERED : TRANSACTION_STATUS.RECOVERING;
//     } else if (decision.actionType === ACTION_TYPE.UPDATE_METHOD) {
//       newStatus = executionResult === 'SUCCESS' ? TRANSACTION_STATUS.RECOVERED : TRANSACTION_STATUS.LOST;
//     } else if (decision.actionType === ACTION_TYPE.ESCALATE) {
//       newStatus = TRANSACTION_STATUS.PENDING_REVIEW;
//     } else if (decision.actionType === ACTION_TYPE.STOP) {
//       newStatus = TRANSACTION_STATUS.LOST;
//     }

//     await prisma.transaction.update({
//       where: { id: tx.id },
//       data: {
//         status: newStatus,
//         retryCount: tx.retryCount + retryIncrement,
//       },
//     });

//     await prisma.agentAction.create({
//       data: {
//         transactionId: tx.id,
//         actionType: decision.actionType,
//         reasoning: decision.reasoning,
//         recoveryScore: decision.recoveryScore,
//         expectedValue: decision.expectedValue,
//         mlScore: decision.mlScore,             // null if the ML service was unavailable
//         scoringMethod: decision.scoringMethod, // "blended" | "rules_fallback"
//         result: executionResult,
//       },
//     });

//     results.push({
//       transactionId: tx.id,
//       actionType: decision.actionType,
//       result: executionResult,
//       newStatus,
//       scoringMethod: decision.scoringMethod,
//     });
//   }

//   return results;
// }

// async function resolveControlGroup(prisma) {
//   const controlTransactions = await prisma.transaction.findMany({
//     where: { isControlGroup: true, status: TRANSACTION_STATUS.FAILED },
//   });

//   for (const tx of controlTransactions) {
//     const recovered = simulateOrganicRecovery(tx);
//     await prisma.transaction.update({
//       where: { id: tx.id },
//       data: { status: recovered ? TRANSACTION_STATUS.RECOVERED : TRANSACTION_STATUS.LOST },
//     });
//   }

//   return controlTransactions.length;
// }

// module.exports = { runAgentBatch, resolveControlGroup };




const { diagnoseAndDecide } = require('./decisionEngine');
const { simulateExecution, simulateOrganicRecovery } = require('./outcomeSimulator');
const { TRANSACTION_STATUS, ACTION_TYPE } = require('../constants');

/**
 * Runs the full diagnose -> decide -> execute -> record pipeline for ONE
 * transaction. Pulled out of runAgentBatch's loop so the demo checkout
 * endpoint can reuse the exact same real logic (real ML call, real
 * AgentAction write) instead of faking a response.
 */
async function processTransaction(prisma, tx) {
  const decision = await diagnoseAndDecide(tx); // async -- calls the ML service internally
  const executionResult = simulateExecution(tx, decision.actionType, decision.recoveryScore);

  let newStatus = tx.status;
  let retryIncrement = 0;

  if (decision.actionType === ACTION_TYPE.RETRY || decision.actionType === ACTION_TYPE.REMINDER) {
    retryIncrement = 1;
    newStatus = executionResult === 'SUCCESS' ? TRANSACTION_STATUS.RECOVERED : TRANSACTION_STATUS.RECOVERING;
  } else if (decision.actionType === ACTION_TYPE.UPDATE_METHOD) {
    newStatus = executionResult === 'SUCCESS' ? TRANSACTION_STATUS.RECOVERED : TRANSACTION_STATUS.LOST;
  } else if (decision.actionType === ACTION_TYPE.ESCALATE) {
    newStatus = TRANSACTION_STATUS.PENDING_REVIEW;
  } else if (decision.actionType === ACTION_TYPE.STOP) {
    newStatus = TRANSACTION_STATUS.LOST;
  }

  await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: newStatus, retryCount: tx.retryCount + retryIncrement },
  });

  const agentAction = await prisma.agentAction.create({
    data: {
      transactionId: tx.id,
      actionType: decision.actionType,
      reasoning: decision.reasoning,
      recoveryScore: decision.recoveryScore,
      expectedValue: decision.expectedValue,
      mlScore: decision.mlScore,
      scoringMethod: decision.scoringMethod,
      result: executionResult,
    },
  });

  return { decision, executionResult, newStatus, agentAction };
}

async function runAgentBatch(prisma) {
  const openTransactions = await prisma.transaction.findMany({
    where: {
      isControlGroup: false,
      status: { in: [TRANSACTION_STATUS.FAILED, TRANSACTION_STATUS.RECOVERING] },
    },
    include: { customer: true },
  });

  const results = [];

  for (const tx of openTransactions) {
    const { decision, executionResult, newStatus } = await processTransaction(prisma, tx);
    results.push({
      transactionId: tx.id,
      actionType: decision.actionType,
      result: executionResult,
      newStatus,
      scoringMethod: decision.scoringMethod,
    });
  }

  return results;
}

async function resolveControlGroup(prisma) {
  const controlTransactions = await prisma.transaction.findMany({
    where: { isControlGroup: true, status: TRANSACTION_STATUS.FAILED },
  });

  for (const tx of controlTransactions) {
    const recovered = simulateOrganicRecovery(tx);
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: recovered ? TRANSACTION_STATUS.RECOVERED : TRANSACTION_STATUS.LOST },
    });
  }

  return controlTransactions.length;
}

module.exports = { runAgentBatch, resolveControlGroup, processTransaction };
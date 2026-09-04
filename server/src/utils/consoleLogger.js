/**
 * server/src/utils/consoleLogger.js
 *
 * Prints a colored, one-glance line to the SERVER terminal for every
 * decision the agent makes -- this is what you show on screen during the
 * demo instead of (or alongside) the UI. No extra npm package needed --
 * these are raw ANSI escape codes, which every modern terminal (including
 * VS Code's integrated terminal and Windows Terminal) renders in color.
 */

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

function colorForResult(result, actionType) {
  if (result === 'SUCCESS') return GREEN;
  if (result === 'FAILURE') return YELLOW;
  if (actionType === 'STOP') return RED;
  if (actionType === 'ESCALATE') return MAGENTA;
  return CYAN;
}

function logDecision({ transactionId, amount, decision, executionResult, newStatus }) {
  const color = colorForResult(executionResult, decision.actionType);
  const resultLabel = executionResult ? `${color}${BOLD}${executionResult}${RESET}` : `${color}${decision.actionType}${RESET}`;

  console.log(
    `${DIM}[agent]${RESET} ${CYAN}TX #${transactionId}${RESET} ` +
    `${DIM}₹${amount}${RESET}  ${BOLD}${decision.actionType}${RESET} → ${resultLabel}  ` +
    `${DIM}(rules ${decision.ruleScore?.toFixed(2)}` +
    `${decision.mlScore !== null && decision.mlScore !== undefined ? `, ML ${decision.mlScore.toFixed(2)}` : ', ML n/a'}` +
    `, blended ${decision.recoveryScore.toFixed(2)}, ${decision.scoringMethod})${RESET}`
  );
  console.log(`${DIM}         ↳ ${decision.reasoning}${RESET}`);
  console.log(`${DIM}         ↳ status: ${newStatus}${RESET}\n`);
}

function logDemoStart({ transactionId, amount, failureReason, customerName }) {
  console.log(
    `\n${BLUE}${BOLD}▶ LIVE DEMO PAYMENT${RESET} ${DIM}——————————————————————————${RESET}\n` +
    `${DIM}  customer:${RESET} ${customerName}  ${DIM}amount:${RESET} ₹${amount}  ${DIM}scenario:${RESET} ${failureReason}\n` +
    `${DIM}  tx #${transactionId} created, running through the agent...${RESET}`
  );
}

function logBatchStart(count) {
  console.log(
    `\n${MAGENTA}${BOLD}▶ RUNNING AGENT BATCH${RESET} ${DIM}on ${count} open transactions...${RESET}\n`
  );
}

function logBatchEnd(count, elapsedSec) {
  console.log(
    `${MAGENTA}${BOLD}▶ BATCH COMPLETE${RESET} ${DIM}— ${count} transactions processed in ${elapsedSec}s${RESET}\n`
  );
}

module.exports = { logDecision, logDemoStart, logBatchStart, logBatchEnd };
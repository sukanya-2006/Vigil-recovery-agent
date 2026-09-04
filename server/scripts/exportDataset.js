/**
 * server/scripts/exportDataset.js
 *
 * Exports every transaction the agent has acted on (i.e. has at least one
 * AgentAction, and was NOT held out as part of the control group) into a
 * flat CSV for ml/train_model.py.
 *
 * Run with:  node server/scripts/exportDataset.js > ml/data/transactions.csv
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const COLUMNS = [
  "transactionId",
  "amount",
  "currency",
  "failureReason",
  "retryCount",
  "hoursSinceCreated",
  "customerSuccessfulPayments",
  "customerFailedPayments",
  "customerSuccessRate",
  "customerDaysSinceSignup",
  "actionType",        // last action the agent took: RETRY | REMINDER | UPDATE_METHOD | ESCALATE | STOP | NO_ACTION
  "recoveryScore",      // rules engine's own 0-1 score at decision time
  "expectedValue",
  "recovered",          // LABEL: 1 if Transaction.status === RECOVERED, else 0
];

function csvEscape(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const transactions = await prisma.transaction.findMany({
    where: {
      isControlGroup: false,          // control group was never acted on
      agentActions: { some: {} },
    },
    include: {
      customer: true,
      agentActions: { orderBy: { createdAt: "desc" }, take: 1 }, // most recent decision
    },
  });

  const rows = [COLUMNS.join(",")];
  const now = Date.now();

  for (const tx of transactions) {
    const lastAction = tx.agentActions[0];
    if (!lastAction) continue;

    const c = tx.customer;
    const totalPayments = (c?.successfulPayments ?? 0) + (c?.failedPayments ?? 0);
    const successRate = totalPayments > 0 ? (c.successfulPayments / totalPayments) : 0;
    const daysSinceSignup = c ? Math.round((now - new Date(c.createdAt)) / 864e5) : 0;
    const hoursSinceCreated = Math.round((now - new Date(tx.createdAt)) / 36e5);

    const row = {
      transactionId: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      failureReason: tx.failureReason,
      retryCount: tx.retryCount,
      hoursSinceCreated,
      customerSuccessfulPayments: c?.successfulPayments ?? 0,
      customerFailedPayments: c?.failedPayments ?? 0,
      customerSuccessRate: Number(successRate.toFixed(4)),
      customerDaysSinceSignup: daysSinceSignup,
      actionType: lastAction.actionType,
      recoveryScore: lastAction.recoveryScore ?? "",
      expectedValue: lastAction.expectedValue ?? "",
      recovered: tx.status === "RECOVERED" ? 1 : 0,
    };

    rows.push(COLUMNS.map((c) => csvEscape(row[c])).join(","));
  }

  process.stdout.write(rows.join("\n") + "\n");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
const { PrismaClient } = require('@prisma/client');
const { diagnoseAndDecide } = require('../services/decisionEngine');

const prisma = new PrismaClient();

async function main() {
  // Only look at treatment-group transactions -- the decision engine should
  // never even be called on control-group ones, but this script is just for
  // eyeballing behavior, so we grab a small, varied sample.
  const transactions = await prisma.transaction.findMany({
    where: { isControlGroup: false },
    include: { customer: true },
    take: 15,
  });

  const rows = transactions.map((t) => {
    const decision = diagnoseAndDecide(t);
    return {
      id: t.id,
      amount: t.amount,
      failureReason: t.failureReason,
      customerHistory: `${t.customer.successfulPayments}/${t.customer.successfulPayments + t.customer.failedPayments}`,
      score: decision.recoveryScore.toFixed(2),
      action: decision.actionType,
      expectedValue: decision.expectedValue.toFixed(0),
    };
  });

  console.table(rows);
  console.log('\nFull reasoning for the first transaction, as an example:');
  console.log(diagnoseAndDecide(transactions[0]).reasoning);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
const { PrismaClient } = require('@prisma/client');
const { runAgentBatch, resolveControlGroup } = require('../services/agent');
const { TRANSACTION_STATUS } = require('../constants');

const prisma = new PrismaClient();

async function main() {
  console.log('Running agent over treatment group...');
  const results = await runAgentBatch(prisma);
  console.log(`Agent made ${results.length} decisions.`);

  console.log('\nResolving control group (organic recovery, no agent involved)...');
  const controlCount = await resolveControlGroup(prisma);
  console.log(`Resolved ${controlCount} control-group transactions.`);

  const treatmentRecovered = await prisma.transaction.aggregate({
    where: { isControlGroup: false, status: TRANSACTION_STATUS.RECOVERED },
    _sum: { amount: true },
    _count: true,
  });
  const treatmentTotal = await prisma.transaction.count({ where: { isControlGroup: false } });

  const controlRecovered = await prisma.transaction.count({
    where: { isControlGroup: true, status: TRANSACTION_STATUS.RECOVERED },
  });
  const controlTotal = await prisma.transaction.count({ where: { isControlGroup: true } });

  const treatmentRate = treatmentRecovered._count / treatmentTotal;
  const controlRate = controlRecovered / controlTotal;
  const lift = treatmentRate - controlRate;

  console.log('\n--- SUMMARY ---');
  console.log(`Treatment group: ${treatmentRecovered._count}/${treatmentTotal} recovered (${(treatmentRate * 100).toFixed(1)}%), ₹${treatmentRecovered._sum.amount || 0} recovered`);
  console.log(`Control group:   ${controlRecovered}/${controlTotal} recovered organically (${(controlRate * 100).toFixed(1)}%)`);
  console.log(`Agent lift:      +${(lift * 100).toFixed(1)} percentage points over doing nothing`);

  const stillOpen = await prisma.transaction.count({
    where: { isControlGroup: false, status: TRANSACTION_STATUS.RECOVERING },
  });
  const pendingReview = await prisma.transaction.count({
    where: { isControlGroup: false, status: TRANSACTION_STATUS.PENDING_REVIEW },
  });
  console.log(`Still retrying:  ${stillOpen}`);
  console.log(`Pending review:  ${pendingReview}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
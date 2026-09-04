/**
 * server/src/scripts/resetAndRerunTreatment.js
 *
 * Your dashboard's headline numbers currently come from transactions that
 * were decided BEFORE the ML layer existed -- old AgentAction rows with no
 * mlScore/scoringMethod. This script:
 *   1. Deletes existing AgentAction rows for the treatment group (control
 *      group is left untouched -- it's your fixed baseline and doesn't
 *      depend on the decision engine at all).
 *   2. Resets those transactions back to FAILED with retryCount 0.
 *   3. Re-runs runAgentBatch(), which now calls the real ML-integrated
 *      diagnoseAndDecide() for every single one.
 *
 * After this runs, EVERY number on your Overview/Transactions/Audit tabs
 * reflects the actual blended rules+ML pipeline -- not a pre-ML leftover.
 *
 * BACK UP YOUR DB FIRST. From server/prisma/:
 *   copy dev.db dev.db.backup
 *
 * Run with (uvicorn must be running on :8001 first):
 *   node src/scripts/resetAndRerunTreatment.js
 */

const { PrismaClient } = require('@prisma/client');
const { runAgentBatch } = require('../services/agent');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking ML service is reachable...');
  try {
    const res = await fetch('http://localhost:8001/health');
    const body = await res.json();
    if (!body.model_loaded) throw new Error('model_loaded is false');
    console.log('ML service OK.\n');
  } catch (err) {
    console.error('ML service is not reachable at http://localhost:8001 -- start uvicorn first (ml/model> uvicorn serve:app --port 8001), then re-run this script.');
    process.exit(1);
  }

  const treatmentCount = await prisma.transaction.count({ where: { isControlGroup: false } });
  console.log(`Resetting ${treatmentCount} treatment-group transactions...`);

  // Delete old AgentAction rows for the treatment group only -- control
  // group has none anyway (it's resolved via simulateOrganicRecovery, not
  // the decision engine).
  const deleted = await prisma.agentAction.deleteMany({
    where: { transaction: { isControlGroup: false } },
  });
  console.log(`Deleted ${deleted.count} old (pre-ML) AgentAction rows.`);

  await prisma.transaction.updateMany({
    where: { isControlGroup: false },
    data: { status: 'FAILED', retryCount: 0 },
  });
  console.log('Reset all treatment transactions to FAILED, retryCount 0.\n');

  console.log('Re-running the full batch through the current (ML-integrated) pipeline...');
  console.log('This calls the ML service once per transaction -- may take a couple of minutes for a large batch.\n');

  const startTime = Date.now();
  const results = await runAgentBatch(prisma);
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

  const blendedCount = results.filter((r) => r.scoringMethod === 'blended').length;
  const fallbackCount = results.filter((r) => r.scoringMethod === 'rules_fallback').length;

  console.log(`\nDone in ${elapsedSec}s. Processed ${results.length} transactions.`);
  console.log(`  ${blendedCount} used the ML-blended score.`);
  console.log(`  ${fallbackCount} fell back to rules-only (ML service was unreachable for that call).`);
  if (fallbackCount > 0) {
    console.log('  ^ If this is more than a handful, check the ML service is still running and re-run this script.');
  }

  console.log('\nRefresh your dashboard -- every number should now reflect the ML-integrated pipeline.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
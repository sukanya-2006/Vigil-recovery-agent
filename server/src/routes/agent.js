const express = require('express');
const { runAgentBatch, resolveControlGroup } = require('../services/agent');
const { decideApprovedAction } = require('../services/decisionEngine');
const { simulateExecution } = require('../services/outcomeSimulator');
const { TRANSACTION_STATUS, ACTION_TYPE } = require('../constants');

module.exports = (prisma) => {
  const router = express.Router();

  // The "run the agent" button on the dashboard. Runs one pass over every
  // open treatment transaction, plus resolves any untouched control-group
  // transactions -- same two functions the runAgent.js script calls.
  router.post('/run', async (req, res) => {
    try {
      const results = await runAgentBatch(prisma);
      const controlResolved = await resolveControlGroup(prisma);
      res.json({ decisionsCount: results.length, controlResolved });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Agent run failed' });
    }
  });

  // The human-review queue's approve/reject action. This is the one
  // endpoint where a person, not the agent, makes the final call on a
  // transaction the agent itself wasn't confident enough to act on alone.
  router.post('/review/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { decision } = req.body; // 'approve' | 'reject'

      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          customer: true,
          agentActions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (!transaction) return res.status(404).json({ error: 'Not found' });
      if (transaction.status !== TRANSACTION_STATUS.PENDING_REVIEW) {
        return res.status(400).json({ error: 'Transaction is not pending review' });
      }

      if (decision === 'reject') {
        await prisma.transaction.update({
          where: { id },
          data: { status: TRANSACTION_STATUS.LOST },
        });
        await prisma.agentAction.create({
          data: {
            transactionId: id,
            actionType: ACTION_TYPE.STOP,
            reasoning: 'Human reviewer rejected the escalated case. Marking as lost.',
            result: null,
          },
        });
        return res.json({ status: TRANSACTION_STATUS.LOST });
      }

      if (decision !== 'approve') {
        return res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
      }

      // Reuse the recovery score that was already computed when this
      // transaction was originally escalated, rather than recomputing --
      // keeps the audit trail's numbers consistent with what the human
      // actually saw when they made the call.
      const lastAction = transaction.agentActions[0];
      const recoveryScore = lastAction?.recoveryScore ?? 0.5;

      const chosenAction = decideApprovedAction(transaction);
      const result = simulateExecution(transaction, chosenAction, recoveryScore);

      let newStatus;
      let retryIncrement = 0;
      if (chosenAction === ACTION_TYPE.RETRY || chosenAction === ACTION_TYPE.REMINDER) {
        retryIncrement = 1;
        newStatus = result === 'SUCCESS' ? TRANSACTION_STATUS.RECOVERED : TRANSACTION_STATUS.RECOVERING;
      } else {
        newStatus = result === 'SUCCESS' ? TRANSACTION_STATUS.RECOVERED : TRANSACTION_STATUS.LOST;
      }

      await prisma.transaction.update({
        where: { id },
        data: { status: newStatus, retryCount: transaction.retryCount + retryIncrement },
      });

      await prisma.agentAction.create({
        data: {
          transactionId: id,
          actionType: chosenAction,
          reasoning: `Human reviewer approved this escalation. Executing ${chosenAction}.`,
          recoveryScore,
          result,
        },
      });

      res.json({ status: newStatus, actionType: chosenAction, result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Review action failed' });
    }
  });

  return router;
};
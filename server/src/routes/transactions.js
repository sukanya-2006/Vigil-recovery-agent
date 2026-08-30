const express = require('express');

module.exports = (prisma) => {
  const router = express.Router();

  // The headline numbers for the dashboard's overview screen -- including
  // the lift calculation, which is the whole point of the control group.
  router.get('/summary', async (req, res) => {
    try {
      const treatmentTotal = await prisma.transaction.count({ where: { isControlGroup: false } });
      const controlTotal = await prisma.transaction.count({ where: { isControlGroup: true } });

      const treatmentRecovered = await prisma.transaction.aggregate({
        where: { isControlGroup: false, status: 'RECOVERED' },
        _sum: { amount: true },
        _count: true,
      });
      const controlRecoveredCount = await prisma.transaction.count({
        where: { isControlGroup: true, status: 'RECOVERED' },
      });

      const stillRetrying = await prisma.transaction.count({
        where: { isControlGroup: false, status: 'RECOVERING' },
      });
      const pendingReview = await prisma.transaction.count({
        where: { isControlGroup: false, status: 'PENDING_REVIEW' },
      });
      const lost = await prisma.transaction.count({
        where: { isControlGroup: false, status: 'LOST' },
      });

      const treatmentRate = treatmentTotal ? treatmentRecovered._count / treatmentTotal : 0;
      const controlRate = controlTotal ? controlRecoveredCount / controlTotal : 0;

      res.json({
        treatmentTotal,
        controlTotal,
        treatmentRecoveredCount: treatmentRecovered._count,
        treatmentRecoveredAmount: treatmentRecovered._sum.amount || 0,
        treatmentRecoveryRate: treatmentRate,
        controlRecoveredCount,
        controlRecoveryRate: controlRate,
        lift: treatmentRate - controlRate,
        stillRetrying,
        pendingReview,
        lost,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to compute summary' });
    }
  });

  // The transaction table, with each row's most recent agent decision
  // attached -- optionally filtered by ?status= or ?group=treatment|control.
  router.get('/transactions', async (req, res) => {
    try {
      const { status, group } = req.query;
      const where = {};
      if (status) where.status = status;
      if (group === 'treatment') where.isControlGroup = false;
      if (group === 'control') where.isControlGroup = true;

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          customer: true,
          agentActions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { id: 'asc' },
      });

      res.json(
        transactions.map((t) => ({
          id: t.id,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          failureReason: t.failureReason,
          isControlGroup: t.isControlGroup,
          retryCount: t.retryCount,
          customerName: t.customer.name,
          latestAction: t.agentActions[0]
            ? {
                actionType: t.agentActions[0].actionType,
                reasoning: t.agentActions[0].reasoning,
                result: t.agentActions[0].result,
              }
            : null,
        }))
      );
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Full detail for one transaction -- every payment attempt and every
  // agent action ever logged against it, in order. This is the "audit
  // trail" drill-down view for a single transaction.
  router.get('/transactions/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          customer: true,
          paymentAttempts: { orderBy: { attemptNumber: 'asc' } },
          agentActions: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!transaction) return res.status(404).json({ error: 'Not found' });
      res.json(transaction);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  });


    // The global audit feed -- every decision the agent (or a human
  // reviewer) has ever made, most recent first. This is the third
  // dashboard screen: proof that nothing happens without a logged reason.
  router.get('/audit', async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const actions = await prisma.agentAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { transaction: { select: { id: true, amount: true, failureReason: true } } },
      });
      res.json(actions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  });

  return router;
};
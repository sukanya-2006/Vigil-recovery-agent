/**
 * server/src/routes/demo.js
 *
 * Powers the fake checkout screen: takes a card number + amount from the
 * frontend, maps the test card number to a failure reason (same convention
 * real payment gateways use for their own test/sandbox mode), creates a
 * REAL Transaction + PaymentAttempt, and runs it through the REAL decision
 * pipeline (rules engine + live ML call). Nothing about the recovery
 * outcome is faked -- only the "card" itself is fake, same as any sandbox
 * checkout.
 *
 * Wire this into server/src/index.js with:
 *   app.use('/api/demo', require('./routes/demo')(prisma));
 */

const express = require('express');
const { processTransaction } = require('../services/agent');
const { logDemoStart } = require('../utils/consoleLogger');
const { TRANSACTION_STATUS, FAILURE_REASON } = require('../constants');

// Test card numbers -> the failure reason they simulate. Shown to the
// person running the demo as a legend under the fake checkout form, same
// convention real gateways (Razorpay, Stripe, etc.) use in their own test
// mode docs.
const TEST_CARD_MAP = {
  '4111111111111111': FAILURE_REASON.NETWORK_TIMEOUT,
  '4000000000000002': FAILURE_REASON.ISSUER_DECLINED,
  '4000000000009995': FAILURE_REASON.INSUFFICIENT_FUNDS,
  '4000000000000069': FAILURE_REASON.EXPIRED_CARD,
  '4000000000003220': FAILURE_REASON.THREE_DS_FAILURE,
};

module.exports = (prisma) => {
  const router = express.Router();

  router.get('/test-cards', (req, res) => {
    res.json(
      Object.entries(TEST_CARD_MAP).map(([number, failureReason]) => ({
        number,
        label: `•••• ${number.slice(-4)}`,
        failureReason,
      }))
    );
  });

  router.post('/simulate', async (req, res) => {
    try {
      const { cardNumber, amount, customerName } = req.body;
      const cleanCard = String(cardNumber || '').replace(/\s/g, '');
      const failureReason = TEST_CARD_MAP[cleanCard] || FAILURE_REASON.OTHER;
      const parsedAmount = Number(amount) || 999;

      let customer = await prisma.customer.findFirst({
        where: { name: customerName || 'Demo Customer' },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: { name: customerName || 'Demo Customer', successfulPayments: 3, failedPayments: 1 },
        });
      }

      const transaction = await prisma.transaction.create({
        data: {
          customerId: customer.id,
          amount: parsedAmount,
          currency: 'INR',
          status: TRANSACTION_STATUS.FAILED,
          failureReason,
          isControlGroup: false,
          retryCount: 0,
        },
        include: { customer: true },
      });

      await prisma.paymentAttempt.create({
        data: { transactionId: transaction.id, attemptNumber: 1, outcome: 'FAILURE' },
      });

      logDemoStart({
        transactionId: transaction.id,
        amount: parsedAmount,
        failureReason,
        customerName: customer.name,
      });

      const { decision, executionResult, newStatus } = await processTransaction(prisma, transaction);

      res.json({
        transactionId: transaction.id,
        amount: parsedAmount,
        failureReason,
        customer: { name: customer.name, successfulPayments: customer.successfulPayments, failedPayments: customer.failedPayments },
        decision: {
          actionType: decision.actionType,
          reasoning: decision.reasoning,
          ruleScore: decision.ruleScore,
          mlScore: decision.mlScore,
          recoveryScore: decision.recoveryScore,
          scoringMethod: decision.scoringMethod,
          expectedValue: decision.expectedValue,
        },
        executionResult,
        finalStatus: newStatus,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Demo simulation failed' });
    }
  });

  return router;
};
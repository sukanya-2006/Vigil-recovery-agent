const { PrismaClient } = require('@prisma/client');
const { TRANSACTION_STATUS, FAILURE_REASON } = require('../src/constants');

const prisma = new PrismaClient();

// --- Seeded random number generator ---------------------------------
// Plain Math.random() would give a different dataset every time you run
// this script, which makes it impossible to compare "rules vs model" or
// "before/after tuning a threshold" on a stable baseline. mulberry32 is
// a small, well-known seeded PRNG -- same seed in, same sequence out,
// every time, on any machine.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42); // fixed seed = reproducible dataset

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function weightedPick(rng, weightedEntries) {
  const total = weightedEntries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [value, weight] of weightedEntries) {
    if (r < weight) return value;
    r -= weight;
  }
  return weightedEntries[weightedEntries.length - 1][0];
}
function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const FIRST_NAMES = ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Karan', 'Divya', 'Arjun', 'Meera', 'Rahul', 'Kavya', 'Aditya', 'Isha', 'Nikhil', 'Pooja'];
const LAST_NAMES = ['Sharma', 'Patel', 'Reddy', 'Gupta', 'Nair', 'Iyer', 'Singh', 'Rao', 'Mehta', 'Kapoor', 'Joshi', 'Verma'];

// Failure reasons weighted the way they'd realistically distribute --
// issuer declines are the most common failure type in Indian card payments,
// followed by insufficient funds and network timeouts. This isn't just
// flavor: how "recoverable" each reason typically is (encoded later, in the
// decision engine) depends on knowing these are realistic proportions.
const FAILURE_REASON_WEIGHTS = [
  [FAILURE_REASON.ISSUER_DECLINED, 35],
  [FAILURE_REASON.INSUFFICIENT_FUNDS, 20],
  [FAILURE_REASON.NETWORK_TIMEOUT, 15],
  [FAILURE_REASON.EXPIRED_CARD, 15],
  [FAILURE_REASON.THREE_DS_FAILURE, 10],
  [FAILURE_REASON.OTHER, 5],
];

const NUM_CUSTOMERS = 150;
const NUM_TRANSACTIONS = 800;
const CONTROL_GROUP_RATE = 0.2; // 20% held out -- agent never touches these

async function main() {
  console.log('Clearing existing data...');
  // Deleted in FK-dependency order: children before parents.
  await prisma.agentAction.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.customer.deleteMany();


  
  // SQLite does NOT reset autoincrement counters when rows are deleted --
  // it keeps climbing from the highest ID it has ever handed out. Without
  // resetting it here, every reseed would produce the same data but with
  // different ID numbers each time, which silently breaks reproducibility:
  // our outcome simulator seeds its randomness off the transaction ID, so
  // different IDs mean different simulated outcomes even for "identical"
  // data. Wrapped in try/catch because sqlite_sequence doesn't exist yet
  // on a brand-new database that has never inserted a row before.
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM sqlite_sequence WHERE name IN ('Customer','Transaction','PaymentAttempt','AgentAction')`
    );
  } catch (e) {
    // First-ever run: sqlite_sequence doesn't exist yet. Safe to ignore.
  }

  console.log(`Creating ${NUM_CUSTOMERS} customers...`);
  const customers = [];
  for (let i = 0; i < NUM_CUSTOMERS; i++) {
    // "Reliable" customers (70% of the base) have mostly-successful
    // histories; "risky" customers (30%) have shakier histories. This
    // split is what later lets the decision engine's use of customer
    // history actually predict something real, instead of being a
    // feature that's wired in but carries no signal.
    const isReliable = rand() < 0.7;
    const successfulPayments = isReliable ? randomInt(rand, 5, 25) : randomInt(rand, 0, 6);
    const failedPayments = isReliable ? randomInt(rand, 0, 2) : randomInt(rand, 2, 8);

    const customer = await prisma.customer.create({
      data: {
        name: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
        successfulPayments,
        failedPayments,
      },
    });
    customers.push(customer);
  }

  console.log(`Creating ${NUM_TRANSACTIONS} at-risk transactions...`);
  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const customer = pick(rand, customers);
    const failureReason = weightedPick(rand, FAILURE_REASON_WEIGHTS);

    // Reliable customers biased toward realistic, everyday transactions --
    // kept in a normal-ish everyday payment range (₹199 - ₹15,000).
    const amount = randomInt(rand, 199, 15000);

    const isControlGroup = rand() < CONTROL_GROUP_RATE;

    const transaction = await prisma.transaction.create({
      data: {
        customerId: customer.id,
        amount,
        failureReason,
        isControlGroup,
        status: TRANSACTION_STATUS.FAILED,
        retryCount: 0,
      },
    });

    // Record the original checkout failure itself as attempt #1 --
    // this is the failure the merchant already experienced, before our
    // agent (or nobody, for the control group) does anything about it.
    await prisma.paymentAttempt.create({
      data: {
        transactionId: transaction.id,
        attemptNumber: 1,
        outcome: 'FAILURE',
      },
    });
  }

  const controlCount = await prisma.transaction.count({ where: { isControlGroup: true } });
  const treatmentCount = await prisma.transaction.count({ where: { isControlGroup: false } });
  console.log(`Done. ${treatmentCount} treatment transactions, ${controlCount} control-group transactions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
# Revenue Recovery Agent — Server

## What's built so far
- Database schema (`prisma/schema.prisma`): Customer, Transaction, PaymentAttempt, AgentAction
- Express server skeleton with a health check (`src/index.js`)
- Shared constants standing in for enums (`src/constants.js`)

## Setup (run this on your own machine — this environment has no network access)

```bash
cd server
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Then visit `http://localhost:4000/health` — you should see `{"status":"ok"}`.

`npx prisma migrate dev` does two things: creates `dev.db` (your actual SQLite
file) and generates the Prisma Client code your routes will import. Run this
again any time you change `schema.prisma`.

## Not built yet (next steps)
- Synthetic data seed script (`prisma/seed.js`)
- Decision engine (`src/services/decisionEngine.js`)
- Agent loop / execution simulator (`src/services/agent.js`)
- API routes (`src/routes/`)
- Client (React dashboard)

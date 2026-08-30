require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Health check exists for one reason: when something is broken later,
// this is the first thing you curl to confirm the server itself is up
// before chasing a bug in the actual logic.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


app.use('/api', require('./routes/transactions')(prisma));
app.use('/api/agent', require('./routes/agent')(prisma));

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Exported so route files (added next) and any test scripts can reuse
// the same Prisma connection instead of each opening their own.
module.exports = { app, prisma };

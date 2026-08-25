import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { casesRouter } from './routes/cases.js';
import { agentsRouter } from './routes/agents.js';
import { policiesRouter } from './routes/policies.js';
import { analyticsRouter } from './routes/analytics.js';
import { runRecoveryRouter } from './routes/runRecovery.js';
import { initDb } from './db/schema.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

// Protected routes — require valid JWT
app.use('/api/cases', requireAuth, casesRouter);
app.use('/api/agents', requireAuth, agentsRouter);
app.use('/api/policies', requireAuth, policiesRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);
app.use('/api/run-recovery', requireAuth, runRecoveryRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status === 400 ? 'Bad Request' : 'Internal server error',
    message: err.message
  });
});

initDb();
app.listen(PORT, () => {
  console.log(`RecoverAI server running on http://localhost:${PORT}`);
});

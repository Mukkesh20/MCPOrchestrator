import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routes/trpc.js';
import { ensureTables } from './db/index.js';

export async function createServer() {
  // Initialize database tables
  await ensureTables();
  
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/trpc', createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
  }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}
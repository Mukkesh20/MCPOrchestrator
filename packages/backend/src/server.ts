// packages/backend/src/server.ts
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routes/trpc.js';
import { ensureTables } from './db/index.js';

export async function createServer() {
  const app = express();

  // Enable CORS for all routes
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Support both Vite dev server ports
    credentials: true,
  }));

  // Parse JSON bodies
  app.use(express.json());

  // Health check endpoint (before tRPC to avoid conflicts)
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'Enhanced MCP-Orchestrator Backend'
    });
  });

  // Initialize database tables
  try {
    await ensureTables();
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    throw error;
  }

  // Set up tRPC middleware
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }) => ({ 
        req, 
        res,
        // Add any additional context here
      }),
    })
  );

  // Add a simple test endpoint to verify server is working
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'Backend server is working',
      timestamp: new Date().toISOString()
    });
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('public'));
    
    // Catch-all handler for React Router
    app.get('*', (req, res) => {
      res.sendFile('index.html', { root: 'public' });
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  });

  return app;
}
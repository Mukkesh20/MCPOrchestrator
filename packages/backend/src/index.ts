// packages/backend/src/index.ts
import express from 'express';
import cors from 'cors';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routes/trpc.js';
import mcpEndpointRoutes from './routes/mcp-endpoints.js';
import { EndpointManager } from './services/endpoint-manager.js';
import { NamespaceManager } from './services/namespace-manager.js';
import { MCPProxy } from './services/mcp-proxy.js';

const app = express();
const PORT = process.env.PORT || 3002; // Use port 3002 to avoid conflicts with frontend

// Initialize core services
const mcpProxy = new MCPProxy();
const endpointManager = new EndpointManager(mcpProxy);
const namespaceManager = new NamespaceManager();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    
    console.log(`${timestamp} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    
    // Log to database if this is an MCP endpoint request
    if (req.mcpEndpoint) {
      // This would be handled by the endpoint manager
      // endpointManager.logRequest(req, res, duration);
    }
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Enhanced MCP-Orchestrator',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Diagnostic endpoint
app.get('/api/diagnostic', (req, res) => {
  console.log('📊 Diagnostic endpoint accessed');
  res.json({
    success: true,
    message: 'Backend API accessible',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    headers: req.headers
  });
});

// tRPC API routes
app.use('/api/trpc', createExpressMiddleware({
  router: appRouter,
  createContext: () => ({}),
}));

// MCP endpoint routes (dynamic endpoints)
app.use('/api/mcp', mcpEndpointRoutes);

// Serve static files for frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist/frontend'));
  
  // Catch-all handler for SPA
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile('index.html', { root: 'dist/frontend' });
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connections, stop MCP servers, etc.
    cleanup().then(() => {
      console.log('✅ Cleanup completed');
      process.exit(0);
    }).catch((err) => {
      console.error('❌ Cleanup failed:', err);
      process.exit(1);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.emit('SIGTERM');
});

async function cleanup() {
  // Stop all MCP servers
  // await mcpServerManager.stopAllServers();
  
  // Close database connections
  // await database.close();
  
  console.log('🧹 Cleanup completed');
}

// Start server
const server = app.listen(PORT, () => {
  console.log('🚀 Enhanced MCP-Orchestrator started');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🔗 tRPC API: http://localhost:${PORT}/api/trpc`);
  console.log(`🌐 MCP Endpoints: http://localhost:${PORT}/api/mcp/*`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎨 Frontend: http://localhost:3000`);
  }
  
  console.log('');
  console.log('📚 Available Features:');
  console.log('  • MCP Server Aggregation into Namespaces');
  console.log('  • Public Endpoints with Authentication');
  console.log('  • Middleware Engine for Request/Response Transformation');
  console.log('  • Chat Playground with Tool Integration');
  console.log('  • Real-time Analytics and Monitoring');
  console.log('  • OpenAPI Documentation Generation');
  console.log('');
});

export { app, server };
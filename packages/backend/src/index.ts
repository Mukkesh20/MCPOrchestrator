import { createServer } from './server.js';

const PORT = process.env.PORT || 3002; // Changed to 3002 to avoid port conflicts

// Self-invoking async function to handle async createServer
(async () => {
  try {
    const app = await createServer();
    
    app.listen(PORT, () => {
      console.log(`🚀 Enhanced MCP-Orchestrator Backend running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 tRPC endpoint: http://localhost:${PORT}/trpc`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
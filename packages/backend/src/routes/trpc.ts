// packages/backend/src/routes/trpc.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { MCPProxy } from '../services/mcp-proxy.js';
import { MCPServerManager } from '../services/server-manager.js';
import { MiddlewareEngine } from '../services/middleware-engine.js';

const t = initTRPC.create();

const mcpProxy = new MCPProxy();
const serverManager = new MCPServerManager();
const middlewareEngine = new MiddlewareEngine();

export const appRouter = t.router({
  // Server Management
  servers: t.router({
    list: t.procedure.query(async () => {
      // Return list of servers
      return [];
    }),

    create: t.procedure
      .input(z.object({
        name: z.string(),
        type: z.enum(['STDIO', 'HTTP']),
        command: z.string().optional(),
        args: z.array(z.string()).optional(),
        url: z.string().optional(),
        namespace: z.string(),
      }))
      .mutation(async ({ input }) => {
        const config = {
          ...input,
          id: '',  // This will be replaced by the server ID
          enabled: true,
          middlewares: []
        };
        const serverId = await serverManager.createServer(config);
        return { ...config, id: serverId };
      }),

    toggle: t.procedure
      .input(z.object({ id: z.string(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        // Toggle server enabled/disabled
        return { success: true };
      }),

    delete: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await serverManager.stopServer(input.id);
        return { success: true };
      }),
  }),

  // Middleware Management
  middlewares: t.router({
    list: t.procedure.query(async () => {
      return await middlewareEngine.getMiddlewares();
    }),

    create: t.procedure
      .input(z.object({
        name: z.string(),
        type: z.enum(['request', 'response', 'bidirectional']),
        code: z.string(),
        priority: z.number().default(100),
        config: z.record(z.any()).default({})
      }))
      .mutation(async ({ input }) => {
        const middleware = {
          id: Math.random().toString(36),
          ...input,
          enabled: true
        };
        await middlewareEngine.addMiddleware(middleware);
        return middleware;
      }),

    update: t.procedure
      .input(z.object({
        id: z.string(),
        code: z.string().optional(),
        enabled: z.boolean().optional(),
        priority: z.number().optional(),
        config: z.record(z.any()).optional()
      }))
      .mutation(async ({ input }) => {
        // Update middleware
        return { success: true };
      }),

    delete: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await middlewareEngine.removeMiddleware(input.id);
        return { success: true };
      }),
  }),

  // Chat/Agent
  chat: t.router({
    createSession: t.procedure
      .input(z.object({
        name: z.string(),
        namespace: z.string(),
        agentConfig: z.object({
          systemPrompt: z.string(),
          enabledTools: z.array(z.string()),
          temperature: z.number(),
          maxTokens: z.number()
        })
      }))
      .mutation(async ({ input }) => {
        return {
          id: Math.random().toString(36),
          ...input,
          messages: [],
          createdAt: new Date()
        };
      }),

    sendMessage: t.procedure
      .input(z.object({
        sessionId: z.string(),
        message: z.string(),
        namespace: z.string()
      }))
      .mutation(async ({ input }) => {
        // Process message and return response
        const tools = await mcpProxy.aggregateServers(input.namespace);
        
        return {
          id: Math.random().toString(36),
          role: 'assistant' as const,
          content: `Processed message: ${input.message}. Available tools: ${tools.tools.length}`,
          timestamp: new Date()
        };
      }),

    getTools: t.procedure
      .input(z.object({ namespace: z.string() }))
      .query(async ({ input }) => {
        return await mcpProxy.aggregateServers(input.namespace);
      }),
  }),

  // Namespaces
  namespaces: t.router({
    list: t.procedure.query(async () => {
      return [
        { id: 'default', name: 'Default', serverCount: 0 },
        { id: 'development', name: 'Development', serverCount: 0 },
        { id: 'production', name: 'Production', serverCount: 0 }
      ];
    }),
  }),
});

export type AppRouter = typeof appRouter;
// packages/backend/src/routes/trpc.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

// Simple in-memory storage for now (will be replaced with database later)
let servers: any[] = [];
let middlewares: any[] = [];
let sessions: any[] = [];

export const appRouter = t.router({
  // Health check procedure
  health: t.procedure.query(async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Enhanced MCP-Orchestrator tRPC API'
    };
  }),

  // Server Management
  servers: t.router({
    list: t.procedure.query(async () => {
      console.log('📋 Listing servers:', servers.length);
      return servers;
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
        const server = {
          id: Math.random().toString(36).substring(2, 15),
          ...input,
          enabled: true,
          middlewares: [],
          createdAt: new Date().toISOString()
        };
        servers.push(server);
        console.log('✅ Created server:', server.name);
        return server;
      }),

    toggle: t.procedure
      .input(z.object({ id: z.string(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        const serverIndex = servers.findIndex(s => s.id === input.id);
        if (serverIndex >= 0) {
          servers[serverIndex].enabled = input.enabled;
          console.log(`🔄 Toggled server ${input.id} to ${input.enabled ? 'enabled' : 'disabled'}`);
        }
        return { success: true };
      }),

    delete: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const originalLength = servers.length;
        servers = servers.filter(s => s.id !== input.id);
        console.log(`🗑️ Deleted server ${input.id} (${originalLength - servers.length} removed)`);
        return { success: true };
      }),
  }),

  // Middleware Management
  middlewares: t.router({
    list: t.procedure.query(async () => {
      console.log('📋 Listing middlewares:', middlewares.length);
      return middlewares;
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
          id: Math.random().toString(36).substring(2, 15),
          ...input,
          enabled: true,
          createdAt: new Date().toISOString()
        };
        middlewares.push(middleware);
        console.log('✅ Created middleware:', middleware.name);
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
        const middlewareIndex = middlewares.findIndex(m => m.id === input.id);
        if (middlewareIndex >= 0) {
          middlewares[middlewareIndex] = { 
            ...middlewares[middlewareIndex], 
            ...input,
            updatedAt: new Date().toISOString()
          };
          console.log(`🔄 Updated middleware ${input.id}`);
        }
        return { success: true };
      }),

    delete: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const originalLength = middlewares.length;
        middlewares = middlewares.filter(m => m.id !== input.id);
        console.log(`🗑️ Deleted middleware ${input.id} (${originalLength - middlewares.length} removed)`);
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
        const session = {
          id: Math.random().toString(36).substring(2, 15),
          ...input,
          messages: [],
          createdAt: new Date().toISOString()
        };
        sessions.push(session);
        console.log('✅ Created chat session:', session.name);
        return session;
      }),

    sendMessage: t.procedure
      .input(z.object({
        sessionId: z.string(),
        message: z.string(),
        namespace: z.string()
      }))
      .mutation(async ({ input }) => {
        // Simulate processing
        const response = {
          id: Math.random().toString(36).substring(2, 15),
          role: 'assistant' as const,
          content: `Echo: ${input.message} [Namespace: ${input.namespace}, Available tools: ${servers.length}]`,
          timestamp: new Date().toISOString()
        };
        console.log(`💬 Processed message in session ${input.sessionId}`);
        return response;
      }),

    getTools: t.procedure
      .input(z.object({ namespace: z.string() }))
      .query(async ({ input }) => {
        // Filter servers by namespace and return mock tools
        const namespaceServers = servers.filter(s => s.namespace === input.namespace && s.enabled);
        const tools = namespaceServers.map(server => ({
          name: `tool_${server.name.toLowerCase().replace(/\s+/g, '_')}`,
          description: `Tool from ${server.name}`,
          inputSchema: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Tool input' }
            }
          }
        }));
        
        console.log(`🔧 Retrieved ${tools.length} tools for namespace: ${input.namespace}`);
        return {
          tools,
          resources: [],
          prompts: []
        };
      }),

    getSessions: t.procedure.query(async () => {
      console.log('📋 Listing chat sessions:', sessions.length);
      return sessions;
    }),

    getMessages: t.procedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const session = sessions.find(s => s.id === input.sessionId);
        console.log(`💬 Retrieved messages for session ${input.sessionId}`);
        return session?.messages || [];
      }),
  }),

  // Namespaces
  namespaces: t.router({
    list: t.procedure.query(async () => {
      // Count servers by namespace
      const namespaceCounts: Record<string, number> = {};
      servers.forEach(server => {
        namespaceCounts[server.namespace] = (namespaceCounts[server.namespace] || 0) + 1;
      });

      const namespaces = [
        { id: 'default', name: 'Default', serverCount: namespaceCounts['default'] || 0 },
        { id: 'development', name: 'Development', serverCount: namespaceCounts['development'] || 0 },
        { id: 'production', name: 'Production', serverCount: namespaceCounts['production'] || 0 }
      ];

      // Add any other namespaces found in servers
      Object.keys(namespaceCounts).forEach(ns => {
        if (!namespaces.find(n => n.id === ns)) {
          namespaces.push({
            id: ns,
            name: ns.charAt(0).toUpperCase() + ns.slice(1),
            serverCount: namespaceCounts[ns]
          });
        }
      });

      console.log('📋 Listing namespaces:', namespaces.length);
      return namespaces;
    }),
  }),
});

export type AppRouter = typeof appRouter;
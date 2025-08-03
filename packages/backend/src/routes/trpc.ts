// packages/backend/src/routes/trpc.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { EndpointManager } from '../services/endpoint-manager.js';
import { NamespaceManager } from '../services/namespace-manager.js';
import { MCPProxy } from '../services/mcp-proxy.js';
import { MiddlewareEngine } from '../services/middleware-engine.js';

const t = initTRPC.create();

// Initialize services
const mcpProxy = new MCPProxy();
const endpointManager = new EndpointManager(mcpProxy);
const namespaceManager = new NamespaceManager();
const middlewareEngine = new MiddlewareEngine();

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
      .input(
        z.object({
          name: z.string().min(1, "Name is required"),
          type: z.enum(['STDIO', 'HTTP']),
          command: z.string().optional(),
          args: z.array(z.string()).optional(),
          url: z.string().optional(),
          namespace: z.string().min(1, "Namespace is required"),
        }).passthrough()
      )
      .mutation(async ({ input }) => {
        console.log('🔍 Simplified server creation:', input);
        
        // Perform basic validation
        if (!input) {
          console.error('❌ No input received');
          throw new Error('Server creation requires input data');
        }
        
        // Type-specific validation
        if (input.type === 'STDIO' && !input.command) {
          throw new Error('Command is required for STDIO servers');
        }

        if (input.type === 'HTTP' && !input.url) {
          throw new Error('URL is required for HTTP servers');
        }
        
        console.log('📥 Validated server creation input:', JSON.stringify(input, null, 2));

        const server = {
          id: Math.random().toString(36).substring(2, 15),
          ...input,
          enabled: true,
          middlewares: [] as string[],
          createdAt: new Date().toISOString()
        };

        servers.push(server);
        
        // Register with namespace manager
        namespaceManager.registerServer(server);
        
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
          return servers[serverIndex];
        }
        throw new Error('Server not found');
      }),

    delete: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const serverIndex = servers.findIndex(s => s.id === input.id);
        if (serverIndex >= 0) {
          const server = servers[serverIndex];
          servers.splice(serverIndex, 1);
          
          // Unregister from namespace manager
          namespaceManager.unregisterServer(input.id);
          
          console.log(`🗑️ Deleted server ${server.name}`);
          return { success: true };
        }
        throw new Error('Server not found');
      }),
  }),

  // Middleware Management
  middlewares: t.router({
    list: t.procedure.query(async () => {
      console.log('📋 Listing middlewares:', middlewares.length);
      return middlewares;
    }),

    create: t.procedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required"),
          type: z.enum(['request', 'response', 'bidirectional']),
          code: z.string().min(1, "Code is required"),
          enabled: z.boolean().default(true),
          priority: z.number().default(100),
          config: z.record(z.any()).default({}),
          namespaces: z.array(z.string()).default(['default'])
        })
      )
      .mutation(async ({ input }) => {
        const middleware = {
          id: Math.random().toString(36).substring(2, 15),
          ...input,
          createdAt: new Date().toISOString()
        };

        middlewares.push(middleware);
        
        // Register with middleware engine and namespace manager
        await middlewareEngine.addMiddleware(middleware);
        namespaceManager.registerMiddleware(middleware);
        
        console.log('✅ Created middleware:', middleware.name);
        return middleware;
      }),

    update: t.procedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          type: z.enum(['request', 'response', 'bidirectional']).optional(),
          code: z.string().optional(),
          enabled: z.boolean().optional(),
          priority: z.number().optional(),
          config: z.record(z.any()).optional(),
          namespaces: z.array(z.string()).optional()
        })
      )
      .mutation(async ({ input }) => {
        const middlewareIndex = middlewares.findIndex(m => m.id === input.id);
        if (middlewareIndex >= 0) {
          const updatedMiddleware = { ...middlewares[middlewareIndex], ...input };
          middlewares[middlewareIndex] = updatedMiddleware;
          
          // Update in middleware engine
          await middlewareEngine.addMiddleware(updatedMiddleware);
          
          console.log(`🔄 Updated middleware ${updatedMiddleware.name}`);
          return updatedMiddleware;
        }
        throw new Error('Middleware not found');
      }),

    delete: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const middlewareIndex = middlewares.findIndex(m => m.id === input.id);
        if (middlewareIndex >= 0) {
          const middleware = middlewares[middlewareIndex];
          middlewares.splice(middlewareIndex, 1);
          
          // Remove from middleware engine and namespace manager
          await middlewareEngine.removeMiddleware(input.id);
          namespaceManager.unregisterMiddleware(input.id);
          
          console.log(`🗑️ Deleted middleware ${middleware.name}`);
          return { success: true };
        }
        throw new Error('Middleware not found');
      }),
  }),

  // Namespace Management
  namespaces: t.router({
    list: t.procedure.query(async () => {
      const namespaces = await namespaceManager.getNamespaces();
      
      // Enhance with server counts and stats
      const enhancedNamespaces = await Promise.all(
        namespaces.map(async (ns) => {
          const stats = await namespaceManager.getNamespaceStats(ns.id);
          return {
            ...ns,
            ...stats
          };
        })
      );

      console.log('📋 Listing namespaces:', enhancedNamespaces.length);
      return enhancedNamespaces;
    }),

    create: t.procedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required"),
          description: z.string().optional(),
          enabled: z.boolean().default(true),
          toolWhitelist: z.array(z.string()).optional(),
          toolBlacklist: z.array(z.string()).optional()
        })
      )
      .mutation(async ({ input }) => {
        const namespace = await namespaceManager.createNamespace({
          ...input,
          servers: [],
          middlewares: []
        });
        
        console.log('✅ Created namespace:', namespace.name);
        return namespace;
      }),

    update: t.procedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          enabled: z.boolean().optional(),
          toolWhitelist: z.array(z.string()).optional(),
          toolBlacklist: z.array(z.string()).optional()
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const namespace = await namespaceManager.updateNamespace(id, updates);
        
        console.log(`🔄 Updated namespace ${namespace.name}`);
        return namespace;
      }),

    delete: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await namespaceManager.deleteNamespace(input.id);
        console.log(`🗑️ Deleted namespace ${input.id}`);
        return { success: true };
      }),

    getDetails: t.procedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const namespace = await namespaceManager.getNamespace(input.id);
        if (!namespace) {
          throw new Error('Namespace not found');
        }

        const servers = await namespaceManager.getNamespaceServers(input.id);
        const middlewares = await namespaceManager.getNamespaceMiddlewares(input.id);
        const tools = await namespaceManager.aggregateNamespaceTools(input.id);
        const validation = await namespaceManager.validateNamespaceConfiguration(input.id);

        return {
          ...namespace,
          servers,
          middlewares,
          tools,
          validation
        };
      }),
  }),

  // Endpoint Management
  endpoints: t.router({
    list: t.procedure.query(async () => {
      const endpoints = await endpointManager.getEndpoints();
      console.log('📋 Listing endpoints:', endpoints.length);
      return endpoints;
    }),

    create: t.procedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required"),
          namespace: z.string().min(1, "Namespace is required"),
          path: z.string().min(1, "Path is required"),
          transport: z.enum(['SSE', 'HTTP', 'WebSocket']),
          auth: z.object({
            type: z.enum(['none', 'api_key', 'bearer', 'basic', 'oauth2']),
            apiKeys: z.array(z.string()).optional(),
            bearerTokens: z.array(z.string()).optional(),
            basicAuth: z.array(z.object({
              username: z.string(),
              password: z.string()
            })).optional(),
            whitelist: z.array(z.string()).optional(),
            blacklist: z.array(z.string()).optional()
          }),
          enabled: z.boolean().default(true),
          rateLimit: z.object({
            enabled: z.boolean(),
            requests: z.number(),
            window: z.number()
          }).optional(),
          cors: z.object({
            enabled: z.boolean(),
            origins: z.array(z.string()),
            methods: z.array(z.string()),
            headers: z.array(z.string()),
            credentials: z.boolean()
          }).optional(),
          openApi: z.boolean().default(false)
        })
      )
      .mutation(async ({ input }) => {
        const endpoint = await endpointManager.createEndpoint(input);
        console.log('✅ Created endpoint:', endpoint.name);
        return endpoint;
      }),

    update: t.procedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          namespace: z.string().optional(),
          path: z.string().optional(),
          enabled: z.boolean().optional(),
          auth: z.object({
            type: z.enum(['none', 'api_key', 'bearer', 'basic', 'oauth2']),
            apiKeys: z.array(z.string()).optional(),
            bearerTokens: z.array(z.string()).optional(),
            basicAuth: z.array(z.object({
              username: z.string(),
              password: z.string()
            })).optional(),
            whitelist: z.array(z.string()).optional(),
            blacklist: z.array(z.string()).optional()
          }).optional(),
          rateLimit: z.object({
            enabled: z.boolean(),
            requests: z.number(),
            window: z.number()
          }).optional(),
          cors: z.object({
            enabled: z.boolean(),
            origins: z.array(z.string()),
            methods: z.array(z.string()),
            headers: z.array(z.string()),
            credentials: z.boolean()
          }).optional()
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const endpoint = await endpointManager.updateEndpoint(id, updates);
        console.log(`🔄 Updated endpoint ${endpoint.name}`);
        return endpoint;
      }),

    delete: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await endpointManager.deleteEndpoint(input.id);
        console.log(`🗑️ Deleted endpoint ${input.id}`);
        return { success: true };
      }),

    switchNamespace: t.procedure
      .input(z.object({ 
        endpointId: z.string(),
        namespaceId: z.string()
      }))
      .mutation(async ({ input }) => {
        const endpoint = await endpointManager.switchNamespace(input.endpointId, input.namespaceId);
        console.log(`🔄 Switched endpoint to namespace ${input.namespaceId}`);
        return endpoint;
      }),

    getAnalytics: t.procedure
      .input(z.object({ endpointId: z.string().optional() }))
      .query(async ({ input }) => {
        const analytics = await endpointManager.getAnalytics(input.endpointId);
        console.log(`📊 Retrieved analytics for ${input.endpointId || 'all endpoints'}`);
        return analytics;
      }),
  }),

  // Chat System
  chat: t.router({
    createSession: t.procedure
      .input(
        z.object({
          name: z.string().min(1, "Session name is required"),
          namespace: z.string().min(1, "Namespace is required"),
          agentConfig: z.object({
            systemPrompt: z.string(),
            enabledTools: z.array(z.string()),
            temperature: z.number().min(0).max(2),
            maxTokens: z.number().min(1)
          })
        })
      )
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
      .input(
        z.object({
          sessionId: z.string(),
          content: z.string(),
          role: z.enum(['user', 'assistant', 'system']).default('user')
        })
      )
      .mutation(async ({ input }) => {
        const session = sessions.find(s => s.id === input.sessionId);
        if (!session) {
          throw new Error('Session not found');
        }

        const message = {
          id: Math.random().toString(36).substring(2, 15),
          ...input,
          timestamp: new Date().toISOString()
        };

        session.messages.push(message);
        console.log(`💬 Added message to session ${input.sessionId}`);
        return message;
      }),

    getTools: t.procedure
      .input(z.object({ namespace: z.string() }))
      .query(async ({ input }) => {
        const tools = await namespaceManager.aggregateNamespaceTools(input.namespace);
        console.log(`🔧 Retrieved ${tools.length} tools for namespace ${input.namespace}`);
        return tools;
      }),

    listSessions: t.procedure.query(async () => {
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

  // System Health and Analytics
  system: t.router({
    health: t.procedure.query(async () => {
      const serverCount = servers.length;
      const enabledServerCount = servers.filter(s => s.enabled).length;
      const middlewareCount = middlewares.length;
      const enabledMiddlewareCount = middlewares.filter(m => m.enabled).length;
      const namespaceCount = (await namespaceManager.getNamespaces()).length;
      const endpointCount = (await endpointManager.getEndpoints()).length;

      return {
        status: 'healthy',
        services: {
          database: 'up',
          mcpServers: enabledServerCount > 0 ? 'up' : 'down',
          endpoints: endpointCount > 0 ? 'up' : 'down'
        },
        stats: {
          servers: { total: serverCount, enabled: enabledServerCount },
          middlewares: { total: middlewareCount, enabled: enabledMiddlewareCount },
          namespaces: namespaceCount,
          endpoints: endpointCount
        },
        uptime: process.uptime(),
        version: '1.0.0',
        lastCheck: new Date().toISOString()
      };
    }),

    analytics: t.procedure.query(async () => {
      const allAnalytics = await endpointManager.getAnalytics();
      const totalRequests = allAnalytics.reduce((sum, a) => sum + a.totalRequests, 0);
      const totalSuccessful = allAnalytics.reduce((sum, a) => sum + a.successfulRequests, 0);
      const averageResponseTime = allAnalytics.reduce((sum, a) => sum + a.averageResponseTime, 0) / allAnalytics.length || 0;

      return {
        endpoints: allAnalytics,
        summary: {
          totalRequests,
          successRate: totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0,
          averageResponseTime: Math.round(averageResponseTime),
          activeEndpoints: allAnalytics.filter(a => a.lastRequestAt && 
            new Date().getTime() - new Date(a.lastRequestAt).getTime() < 24 * 60 * 60 * 1000
          ).length
        }
      };
    }),
  })
});

export type AppRouter = typeof appRouter;
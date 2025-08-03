// packages/backend/src/services/endpoint-manager.ts
import { EndpointConfig, AuthConfig, NamespaceConfig, EndpointAnalytics } from '../types/index.js';
import { MCPProxy } from './mcp-proxy.js';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export class EndpointManager {
  private endpoints: Map<string, EndpointConfig> = new Map();
  private analytics: Map<string, EndpointAnalytics> = new Map();
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
  private mcpProxy: MCPProxy;

  constructor(mcpProxy: MCPProxy) {
    this.mcpProxy = mcpProxy;
  }

  async createEndpoint(config: Omit<EndpointConfig, 'id' | 'createdAt'>): Promise<EndpointConfig> {
    const endpoint: EndpointConfig = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    // Validate path uniqueness
    const existingPaths = Array.from(this.endpoints.values()).map(e => e.path);
    if (existingPaths.includes(endpoint.path)) {
      throw new Error(`Endpoint path ${endpoint.path} already exists`);
    }

    this.endpoints.set(endpoint.id, endpoint);
    
    // Initialize analytics
    this.analytics.set(endpoint.id, {
      endpointId: endpoint.id,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      topTools: []
    });

    console.log(`✅ Created endpoint ${endpoint.name} at ${endpoint.path}`);
    return endpoint;
  }

  async getEndpoints(): Promise<EndpointConfig[]> {
    return Array.from(this.endpoints.values());
  }

  async getEndpoint(id: string): Promise<EndpointConfig | undefined> {
    return this.endpoints.get(id);
  }

  async getEndpointByPath(path: string): Promise<EndpointConfig | undefined> {
    return Array.from(this.endpoints.values()).find(e => e.path === path);
  }

  async updateEndpoint(id: string, updates: Partial<EndpointConfig>): Promise<EndpointConfig> {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) {
      throw new Error(`Endpoint ${id} not found`);
    }

    const updatedEndpoint = { ...endpoint, ...updates };
    this.endpoints.set(id, updatedEndpoint);
    
    console.log(`🔄 Updated endpoint ${endpoint.name}`);
    return updatedEndpoint;
  }

  async deleteEndpoint(id: string): Promise<void> {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) {
      throw new Error(`Endpoint ${id} not found`);
    }

    this.endpoints.delete(id);
    this.analytics.delete(id);
    
    console.log(`🗑️ Deleted endpoint ${endpoint.name}`);
  }

  async switchNamespace(endpointId: string, newNamespace: string): Promise<EndpointConfig> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint ${endpointId} not found`);
    }

    endpoint.namespace = newNamespace;
    this.endpoints.set(endpointId, endpoint);
    
    console.log(`🔄 Switched endpoint ${endpoint.name} to namespace ${newNamespace}`);
    return endpoint;
  }

  // Middleware for handling endpoint requests
  createEndpointMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const path = req.path;
      const endpoint = await this.getEndpointByPath(path);
      
      if (!endpoint || !endpoint.enabled) {
        return res.status(404).json({ error: 'Endpoint not found or disabled' });
      }

      // Update last accessed time
      endpoint.lastAccessed = new Date();
      this.endpoints.set(endpoint.id, endpoint);

      const startTime = Date.now();

      try {
        // Apply authentication
        const authResult = await this.authenticateRequest(req, endpoint.auth);
        if (!authResult.success) {
          await this.recordRequest(endpoint.id, false, Date.now() - startTime);
          return res.status(401).json({ error: authResult.error });
        }

        // Apply rate limiting
        const rateLimitResult = await this.checkRateLimit(req, endpoint);
        if (!rateLimitResult.allowed) {
          await this.recordRequest(endpoint.id, false, Date.now() - startTime);
          return res.status(429).json({ 
            error: 'Rate limit exceeded',
            resetTime: rateLimitResult.resetTime
          });
        }

        // Apply CORS
        if (endpoint.cors?.enabled) {
          this.applyCors(res, endpoint.cors);
        }

        // Store endpoint info for downstream handlers
        req.mcpEndpoint = endpoint;
        
        await this.recordRequest(endpoint.id, true, Date.now() - startTime);
        next();
        
      } catch (error) {
        console.error(`Endpoint ${endpoint.name} error:`, error);
        await this.recordRequest(endpoint.id, false, Date.now() - startTime);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  // Handle MCP requests through endpoints
  async handleMCPRequest(endpoint: EndpointConfig, request: any): Promise<any> {
    try {
      switch (request.method) {
        case 'tools/list':
          const aggregated = await this.mcpProxy.aggregateServers(endpoint.namespace);
          return {
            tools: aggregated.tools.map((tool: any) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema
            }))
          };

        case 'tools/call':
          const result = await this.mcpProxy.callTool(
            endpoint.namespace,
            request.params.name,
            request.params.arguments
          );
          return { content: [{ type: 'text', text: result }] };

        case 'resources/list':
          const resources = await this.mcpProxy.aggregateServers(endpoint.namespace);
          return { resources: resources.resources };

        case 'prompts/list':
          const prompts = await this.mcpProxy.aggregateServers(endpoint.namespace);
          return { prompts: prompts.prompts };

        default:
          throw new Error(`Unsupported method: ${request.method}`);
      }
    } catch (error) {
      console.error(`MCP request error:`, error);
      throw error;
    }
  }

  private async authenticateRequest(req: Request, auth: AuthConfig): Promise<{ success: boolean; error?: string }> {
    if (auth.type === 'none') {
      return { success: true };
    }

    const clientIp = req.ip || req.connection.remoteAddress || '';

    // IP whitelist/blacklist check
    if (auth.blacklist?.includes(clientIp)) {
      return { success: false, error: 'IP address blacklisted' };
    }
    
    if (auth.whitelist && !auth.whitelist.includes(clientIp)) {
      return { success: false, error: 'IP address not whitelisted' };
    }

    switch (auth.type) {
      case 'api_key':
        const apiKey = req.headers['x-api-key'] as string;
        if (!apiKey || !auth.apiKeys?.includes(apiKey)) {
          return { success: false, error: 'Invalid API key' };
        }
        break;

      case 'bearer':
        const authorization = req.headers.authorization;
        if (!authorization?.startsWith('Bearer ')) {
          return { success: false, error: 'Bearer token required' };
        }
        const token = authorization.slice(7);
        if (!auth.bearerTokens?.includes(token)) {
          return { success: false, error: 'Invalid bearer token' };
        }
        break;

      case 'basic':
        const basicAuth = req.headers.authorization;
        if (!basicAuth?.startsWith('Basic ')) {
          return { success: false, error: 'Basic auth required' };
        }
        const credentials = Buffer.from(basicAuth.slice(6), 'base64').toString();
        const [username, password] = credentials.split(':');
        const validCredentials = auth.basicAuth?.some(
          cred => cred.username === username && cred.password === password
        );
        if (!validCredentials) {
          return { success: false, error: 'Invalid credentials' };
        }
        break;

      default:
        return { success: false, error: 'Unsupported auth type' };
    }

    return { success: true };
  }

  private async checkRateLimit(req: Request, endpoint: EndpointConfig): Promise<{ allowed: boolean; resetTime?: number }> {
    if (!endpoint.rateLimit?.enabled) {
      return { allowed: true };
    }

    const key = `${endpoint.id}:${req.ip}`;
    const now = Date.now();
    const windowMs = endpoint.rateLimit.window * 1000;
    
    const current = this.rateLimitStore.get(key);
    
    if (!current || now > current.resetTime) {
      // New window
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return { allowed: true };
    }

    if (current.count >= endpoint.rateLimit.requests) {
      return { 
        allowed: false, 
        resetTime: current.resetTime 
      };
    }

    current.count++;
    this.rateLimitStore.set(key, current);
    return { allowed: true };
  }

  private applyCors(res: Response, cors: any) {
    if (cors.origins && cors.origins.length > 0) {
      res.header('Access-Control-Allow-Origin', cors.origins.join(','));
    }
    if (cors.methods && cors.methods.length > 0) {
      res.header('Access-Control-Allow-Methods', cors.methods.join(','));
    }
    if (cors.headers && cors.headers.length > 0) {
      res.header('Access-Control-Allow-Headers', cors.headers.join(','));
    }
    if (cors.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }

  private async recordRequest(endpointId: string, success: boolean, responseTime: number) {
    const analytics = this.analytics.get(endpointId);
    if (!analytics) return;

    analytics.totalRequests++;
    if (success) {
      analytics.successfulRequests++;
    } else {
      analytics.failedRequests++;
    }

    // Update average response time
    analytics.averageResponseTime = 
      (analytics.averageResponseTime * (analytics.totalRequests - 1) + responseTime) / 
      analytics.totalRequests;

    analytics.lastRequestAt = new Date();
    this.analytics.set(endpointId, analytics);
  }

  async getAnalytics(endpointId?: string): Promise<EndpointAnalytics[]> {
    if (endpointId) {
      const analytics = this.analytics.get(endpointId);
      return analytics ? [analytics] : [];
    }
    
    return Array.from(this.analytics.values());
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      mcpEndpoint?: EndpointConfig;
    }
  }
}
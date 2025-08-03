// packages/backend/src/services/namespace-manager.ts
import { NamespaceConfig, MCPServerConfig, MiddlewareConfig } from '../types/index.js';
import crypto from 'crypto';

export class NamespaceManager {
  private namespaces: Map<string, NamespaceConfig> = new Map();
  private servers: Map<string, MCPServerConfig> = new Map();
  private middlewares: Map<string, MiddlewareConfig> = new Map();

  constructor() {
    // Initialize default namespaces
    this.initializeDefaultNamespaces();
  }

  private initializeDefaultNamespaces() {
    const defaultNamespaces = [
      {
        id: 'default',
        name: 'Default',
        description: 'Default namespace for development and testing',
        servers: [],
        middlewares: [],
        enabled: true
      },
      {
        id: 'development',
        name: 'Development',
        description: 'Development environment namespace',
        servers: [],
        middlewares: [],
        enabled: true
      },
      {
        id: 'production',
        name: 'Production',
        description: 'Production environment namespace',
        servers: [],
        middlewares: [],
        enabled: true
      }
    ];

    defaultNamespaces.forEach(ns => {
      this.namespaces.set(ns.id, ns);
    });
  }

  async createNamespace(config: Omit<NamespaceConfig, 'id'>): Promise<NamespaceConfig> {
    const namespace: NamespaceConfig = {
      ...config,
      id: crypto.randomUUID(),
    };

    // Validate name uniqueness
    const existingNames = Array.from(this.namespaces.values()).map(ns => ns.name);
    if (existingNames.includes(namespace.name)) {
      throw new Error(`Namespace name ${namespace.name} already exists`);
    }

    this.namespaces.set(namespace.id, namespace);
    console.log(`✅ Created namespace ${namespace.name}`);
    return namespace;
  }

  async getNamespaces(): Promise<NamespaceConfig[]> {
    return Array.from(this.namespaces.values());
  }

  async getNamespace(id: string): Promise<NamespaceConfig | undefined> {
    return this.namespaces.get(id);
  }

  async updateNamespace(id: string, updates: Partial<NamespaceConfig>): Promise<NamespaceConfig> {
    const namespace = this.namespaces.get(id);
    if (!namespace) {
      throw new Error(`Namespace ${id} not found`);
    }

    const updatedNamespace = { ...namespace, ...updates };
    this.namespaces.set(id, updatedNamespace);
    
    console.log(`🔄 Updated namespace ${namespace.name}`);
    return updatedNamespace;
  }

  async deleteNamespace(id: string): Promise<void> {
    const namespace = this.namespaces.get(id);
    if (!namespace) {
      throw new Error(`Namespace ${id} not found`);
    }

    // Prevent deletion of default namespaces
    if (['default', 'development', 'production'].includes(id)) {
      throw new Error('Cannot delete default namespaces');
    }

    this.namespaces.delete(id);
    console.log(`🗑️ Deleted namespace ${namespace.name}`);
  }

  async addServerToNamespace(namespaceId: string, serverId: string): Promise<void> {
    const namespace = this.namespaces.get(namespaceId);
    if (!namespace) {
      throw new Error(`Namespace ${namespaceId} not found`);
    }

    if (!namespace.servers.includes(serverId)) {
      namespace.servers.push(serverId);
      this.namespaces.set(namespaceId, namespace);
      console.log(`➕ Added server ${serverId} to namespace ${namespace.name}`);
    }
  }

  async removeServerFromNamespace(namespaceId: string, serverId: string): Promise<void> {
    const namespace = this.namespaces.get(namespaceId);
    if (!namespace) {
      throw new Error(`Namespace ${namespaceId} not found`);
    }

    namespace.servers = namespace.servers.filter(id => id !== serverId);
    this.namespaces.set(namespaceId, namespace);
    console.log(`➖ Removed server ${serverId} from namespace ${namespace.name}`);
  }

  async addMiddlewareToNamespace(namespaceId: string, middlewareId: string): Promise<void> {
    const namespace = this.namespaces.get(namespaceId);
    if (!namespace) {
      throw new Error(`Namespace ${namespaceId} not found`);
    }

    if (!namespace.middlewares.includes(middlewareId)) {
      namespace.middlewares.push(middlewareId);
      this.namespaces.set(namespaceId, namespace);
      console.log(`➕ Added middleware ${middlewareId} to namespace ${namespace.name}`);
    }
  }

  async removeMiddlewareFromNamespace(namespaceId: string, middlewareId: string): Promise<void> {
    const namespace = this.namespaces.get(namespaceId);
    if (!namespace) {
      throw new Error(`Namespace ${namespaceId} not found`);
    }

    namespace.middlewares = namespace.middlewares.filter(id => id !== middlewareId);
    this.namespaces.set(namespaceId, namespace);
    console.log(`➖ Removed middleware ${middlewareId} from namespace ${namespace.name}`);
  }

  async getNamespaceServers(namespaceId: string): Promise<MCPServerConfig[]> {
    const namespace = this.namespaces.get(namespaceId);
    if (!namespace) {
      throw new Error(`Namespace ${namespaceId} not found`);
    }

    return namespace.servers
      .map(serverId => this.servers.get(serverId))
      .filter((server): server is MCPServerConfig => server !== undefined);
  }

  async getNamespaceMiddlewares(namespaceId: string): Promise<MiddlewareConfig[]> {
    const namespace = this.namespaces.get(namespaceId);
    if (!namespace) {
      throw new Error(`Namespace ${namespaceId} not found`);
    }

    return namespace.middlewares
      .map(middlewareId => this.middlewares.get(middlewareId))
      .filter((middleware): middleware is MiddlewareConfig => middleware !== undefined);
  }

  async aggregateNamespaceTools(namespaceId: string): Promise<any[]> {
    const namespace = this.namespaces.get(namespaceId);
    if (!namespace || !namespace.enabled) {
      return [];
    }

    const servers = await this.getNamespaceServers(namespaceId);
    let allTools: any[] = [];

    // Collect tools from all servers in the namespace
    for (const server of servers) {
      if (server.enabled) {
        // Here you would get tools from the actual server
        // For now, we'll use a placeholder
        const serverTools = await this.getToolsFromServer(server);
        allTools.push(...serverTools);
      }
    }

    // Apply namespace-level filtering
    if (namespace.toolWhitelist && namespace.toolWhitelist.length > 0) {
      allTools = allTools.filter(tool => 
        namespace.toolWhitelist!.includes(tool.name)
      );
    }

    if (namespace.toolBlacklist && namespace.toolBlacklist.length > 0) {
      allTools = allTools.filter(tool => 
        !namespace.toolBlacklist!.includes(tool.name)
      );
    }

    return allTools;
  }

  private async getToolsFromServer(server: MCPServerConfig): Promise<any[]> {
    // This would interface with the actual MCP server
    // For now, return placeholder tools
    return [
      {
        name: `${server.name}_tool_1`,
        description: `Tool from ${server.name}`,
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async getNamespaceStats(namespaceId: string): Promise<{
    serverCount: number;
    enabledServerCount: number;
    middlewareCount: number;
    enabledMiddlewareCount: number;
    toolCount: number;
  }> {
    const namespace = this.namespaces.get(namespaceId);
    if (!namespace) {
      throw new Error(`Namespace ${namespaceId} not found`);
    }

    const servers = await this.getNamespaceServers(namespaceId);
    const middlewares = await this.getNamespaceMiddlewares(namespaceId);
    const tools = await this.aggregateNamespaceTools(namespaceId);

    return {
      serverCount: servers.length,
      enabledServerCount: servers.filter(s => s.enabled).length,
      middlewareCount: middlewares.length,
      enabledMiddlewareCount: middlewares.filter(m => m.enabled).length,
      toolCount: tools.length
    };
  }

  // Helper methods for server and middleware management
  registerServer(server: MCPServerConfig): void {
    this.servers.set(server.id, server);
    
    // Add to namespace
    if (server.namespace) {
      this.addServerToNamespace(server.namespace, server.id).catch(console.error);
    }
  }

  unregisterServer(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server && server.namespace) {
      this.removeServerFromNamespace(server.namespace, serverId).catch(console.error);
    }
    this.servers.delete(serverId);
  }

  registerMiddleware(middleware: MiddlewareConfig): void {
    this.middlewares.set(middleware.id, middleware);
    
    // Add to applicable namespaces
    middleware.namespaces.forEach(namespaceId => {
      this.addMiddlewareToNamespace(namespaceId, middleware.id).catch(console.error);
    });
  }

  unregisterMiddleware(middlewareId: string): void {
    const middleware = this.middlewares.get(middlewareId);
    if (middleware) {
      middleware.namespaces.forEach(namespaceId => {
        this.removeMiddlewareFromNamespace(namespaceId, middlewareId).catch(console.error);
      });
    }
    this.middlewares.delete(middlewareId);
  }

  async validateNamespaceConfiguration(namespaceId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const namespace = this.namespaces.get(namespaceId);
    if (!namespace) {
      return {
        valid: false,
        errors: [`Namespace ${namespaceId} not found`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if namespace has servers
    if (namespace.servers.length === 0) {
      warnings.push('Namespace has no servers configured');
    }

    // Check if servers exist and are valid
    for (const serverId of namespace.servers) {
      const server = this.servers.get(serverId);
      if (!server) {
        errors.push(`Server ${serverId} not found`);
      } else if (!server.enabled) {
        warnings.push(`Server ${server.name} is disabled`);
      }
    }

    // Check middleware validity
    for (const middlewareId of namespace.middlewares) {
      const middleware = this.middlewares.get(middlewareId);
      if (!middleware) {
        errors.push(`Middleware ${middlewareId} not found`);
      } else if (!middleware.enabled) {
        warnings.push(`Middleware ${middleware.name} is disabled`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
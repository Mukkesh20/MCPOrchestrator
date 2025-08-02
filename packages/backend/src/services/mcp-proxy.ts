// packages/backend/src/services/mcp-proxy.ts
import { MCPServerConfig, MiddlewareConfig } from '../types/index.js';
import { MiddlewareEngine } from './middleware-engine.js';
import { MCPServerManager } from './server-manager.js';

export class MCPProxy {
  private serverManager: MCPServerManager;
  private middlewareEngine: MiddlewareEngine;

  constructor() {
    this.serverManager = new MCPServerManager();
    this.middlewareEngine = new MiddlewareEngine();
  }

  async aggregateServers(namespace: string): Promise<any> {
    const servers = await this.serverManager.getServersByNamespace(namespace);
    const tools: any[] = [];
    const resources: any[] = [];
    const prompts: any[] = [];

    for (const server of servers) {
      if (!server.enabled) continue;

      try {
        const serverTools = await this.serverManager.getTools(server.id);
        const serverResources = await this.serverManager.getResources(server.id);
        const serverPrompts = await this.serverManager.getPrompts(server.id);

        tools.push(...serverTools);
        resources.push(...serverResources);
        prompts.push(...serverPrompts);
      } catch (error) {
        console.error(`Error getting tools from server ${server.id}:`, error);
      }
    }

    // Apply middleware transformations
    const processedTools = await this.middlewareEngine.processTools(tools, namespace);
    
    return {
      tools: processedTools,
      resources,
      prompts
    };
  }

  async callTool(namespace: string, toolName: string, arguments_: Record<string, any>): Promise<any> {
    // Apply request middleware
    const processedRequest = await this.middlewareEngine.processRequest({
      tool: toolName,
      arguments: arguments_,
      namespace
    });

    // Find the server that owns this tool
    const server = await this.serverManager.getServerByTool(toolName, namespace);
    if (!server) {
      throw new Error(`Tool ${toolName} not found in namespace ${namespace}`);
    }

    // Call the tool
    const result = await this.serverManager.callTool(server.id, toolName, processedRequest.arguments);

    // Apply response middleware
    const processedResponse = await this.middlewareEngine.processResponse({
      tool: toolName,
      result,
      namespace
    });

    return processedResponse.result;
  }
}
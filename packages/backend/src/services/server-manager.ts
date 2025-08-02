// packages/backend/src/services/server-manager.ts
import { spawn, ChildProcess } from 'child_process';
import { MCPServerConfig } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { MCPClient } from '../lib/mcp-sdk.js';

export class MCPServerManager {
  private servers: Map<string, MCPServerInstance> = new Map();
  private configs: Map<string, MCPServerConfig> = new Map();

  async createServer(config: MCPServerConfig): Promise<string> {
    const serverId = config.id || uuidv4();
    
    if (config.type === 'STDIO') {
      const process = spawn(config.command!, config.args || [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const instance: MCPServerInstance = {
        id: serverId,
        config,
        process,
        status: 'starting'
      };

      this.servers.set(serverId, instance);
      this.configs.set(serverId, config);

      // Handle process lifecycle
      process.on('spawn', () => {
        instance.status = 'running';
        console.log(`MCP Server ${serverId} started`);
      });

      process.on('error', (error) => {
        instance.status = 'error';
        console.error(`MCP Server ${serverId} error:`, error);
      });

      process.on('exit', (code) => {
        instance.status = 'stopped';
        console.log(`MCP Server ${serverId} exited with code ${code}`);
      });
    }

    return serverId;
  }

  async getServersByNamespace(namespace: string): Promise<MCPServerConfig[]> {
    return Array.from(this.configs.values()).filter(config => config.namespace === namespace);
  }

  async getTools(serverId: string): Promise<any[]> {
    const instance = this.servers.get(serverId);
    if (!instance || instance.status !== 'running') {
      return [];
    }

    // Simulate MCP communication - in real implementation, use MCP SDK
    return [
      {
        name: `tool_${serverId}_1`,
        description: `Tool from server ${serverId}`,
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          }
        }
      }
    ];
  }

  async getResources(serverId: string): Promise<any[]> {
    // Similar to getTools but for resources
    return [];
  }

  async getPrompts(serverId: string): Promise<any[]> {
    // Similar to getTools but for prompts
    return [];
  }

  async getServerByTool(toolName: string, namespace: string): Promise<MCPServerConfig | null> {
    // Find which server owns this tool
    const servers = await this.getServersByNamespace(namespace);
    
    for (const server of servers) {
      const tools = await this.getTools(server.id);
      if (tools.some(tool => tool.name === toolName)) {
        return server;
      }
    }

    return null;
  }

  async callTool(serverId: string, toolName: string, arguments_: Record<string, any>): Promise<any> {
    const instance = this.servers.get(serverId);
    if (!instance || instance.status !== 'running') {
      throw new Error(`Server ${serverId} is not running`);
    }

    // Simulate tool call - in real implementation, use MCP SDK
    return {
      content: `Result from ${toolName} with args: ${JSON.stringify(arguments_)}`,
      isError: false
    };
  }

  async stopServer(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (instance && instance.process) {
      instance.process.kill();
      this.servers.delete(serverId);
    }
  }
}

interface MCPServerInstance {
  id: string;
  config: MCPServerConfig;
  process?: ChildProcess;
  status: 'starting' | 'running' | 'stopped' | 'error';
}
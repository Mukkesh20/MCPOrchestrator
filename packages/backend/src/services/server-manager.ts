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
      if (!config.command) {
        throw new Error('Command is required for STDIO servers');
      }

      const process = spawn(config.command, config.args || [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const instance: MCPServerInstance = {
        id: serverId,
        config,
        process,
        status: 'starting',
        client: null
      };

      this.servers.set(serverId, instance);
      this.configs.set(serverId, config);

      // Handle process lifecycle
      process.on('spawn', async () => {
        instance.status = 'running';
        console.log(`✅ MCP Server ${serverId} (${config.name}) started`);
        
        // Initialize MCP client for STDIO communication
        try {
          instance.client = new MCPClient({
            process,
            serverId
          });
          await instance.client.initialize();
        } catch (error) {
          console.error(`Failed to initialize MCP client for ${serverId}:`, error);
          instance.status = 'error';
        }
      });

      process.on('error', (error) => {
        instance.status = 'error';
        console.error(`❌ MCP Server ${serverId} error:`, error);
      });

      process.on('exit', (code) => {
        instance.status = 'stopped';
        console.log(`🔄 MCP Server ${serverId} exited with code ${code}`);
        this.servers.delete(serverId);
      });

      // Handle stderr for debugging
      process.stderr?.on('data', (data) => {
        console.warn(`MCP Server ${serverId} stderr:`, data.toString());
      });

    } else if (config.type === 'HTTP') {
      if (!config.url) {
        throw new Error('URL is required for HTTP servers');
      }

      const instance: MCPServerInstance = {
        id: serverId,
        config,
        status: 'starting',
        client: null
      };

      this.servers.set(serverId, instance);
      this.configs.set(serverId, config);

      try {
        // Initialize HTTP client
        instance.client = new MCPClient({
          baseUrl: config.url,
          serverId
        });
        await instance.client.initialize();
        instance.status = 'running';
        console.log(`✅ MCP HTTP Server ${serverId} (${config.name}) connected`);
      } catch (error) {
        console.error(`❌ Failed to connect to HTTP server ${serverId}:`, error);
        instance.status = 'error';
      }
    }

    return serverId;
  }

  async getServersByNamespace(namespace: string): Promise<MCPServerConfig[]> {
    return Array.from(this.configs.values()).filter(config => config.namespace === namespace);
  }

  async getTools(serverId: string): Promise<any[]> {
    const instance = this.servers.get(serverId);
    if (!instance || instance.status !== 'running' || !instance.client) {
      return [];
    }

    try {
      return await instance.client.getTools();
    } catch (error) {
      console.error(`Failed to get tools from server ${serverId}:`, error);
      return [];
    }
  }

  async getResources(serverId: string): Promise<any[]> {
    const instance = this.servers.get(serverId);
    if (!instance || instance.status !== 'running' || !instance.client) {
      return [];
    }

    try {
      return await instance.client.getResources();
    } catch (error) {
      console.error(`Failed to get resources from server ${serverId}:`, error);
      return [];
    }
  }

  async getPrompts(serverId: string): Promise<any[]> {
    const instance = this.servers.get(serverId);
    if (!instance || instance.status !== 'running' || !instance.client) {
      return [];
    }

    try {
      return await instance.client.getPrompts();
    } catch (error) {
      console.error(`Failed to get prompts from server ${serverId}:`, error);
      return [];
    }
  }

  async getServerByTool(toolName: string, namespace: string): Promise<MCPServerConfig | null> {
    // Find which server owns this tool
    const servers = await this.getServersByNamespace(namespace);
    
    for (const server of servers) {
      if (!server.enabled) continue;
      
      try {
        const tools = await this.getTools(server.id);
        if (tools.some(tool => tool.name === toolName)) {
          return server;
        }
      } catch (error) {
        console.error(`Error checking tools for server ${server.id}:`, error);
      }
    }

    return null;
  }

  async callTool(serverId: string, toolName: string, arguments_: Record<string, any>): Promise<any> {
    const instance = this.servers.get(serverId);
    if (!instance || instance.status !== 'running' || !instance.client) {
      throw new Error(`Server ${serverId} is not running or not connected`);
    }

    try {
      return await instance.client.callTool(toolName, arguments_);
    } catch (error) {
      console.error(`Failed to call tool ${toolName} on server ${serverId}:`, error);
      throw error;
    }
  }

  async stopServer(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (instance) {
      if (instance.process) {
        instance.process.kill('SIGTERM');
        
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (instance.process && !instance.process.killed) {
            instance.process.kill('SIGKILL');
          }
        }, 5000);
      }
      
      // Clean up client connection
      if (instance.client) {
        try {
          await instance.client.disconnect();
        } catch (error) {
          console.warn(`Error disconnecting client for server ${serverId}:`, error);
        }
      }
      
      this.servers.delete(serverId);
      this.configs.delete(serverId);
      console.log(`🛑 MCP Server ${serverId} stopped`);
    }
  }

  async getServerStatus(serverId: string): Promise<'starting' | 'running' | 'stopped' | 'error' | 'not_found'> {
    const instance = this.servers.get(serverId);
    return instance?.status || 'not_found';
  }

  async getAllServers(): Promise<Map<string, MCPServerInstance>> {
    return new Map(this.servers);
  }

  async restartServer(serverId: string): Promise<void> {
    const config = this.configs.get(serverId);
    if (!config) {
      throw new Error(`Server configuration not found for ${serverId}`);
    }

    await this.stopServer(serverId);
    
    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.createServer(config);
  }
}

interface MCPServerInstance {
  id: string;
  config: MCPServerConfig;
  process?: ChildProcess;
  status: 'starting' | 'running' | 'stopped' | 'error';
  client: MCPClient | null;
}
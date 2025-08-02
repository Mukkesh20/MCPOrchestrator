export interface MCPServerConfig {
    id: string;
    name: string;
    type: 'STDIO' | 'HTTP';
    command?: string;
    args?: string[];
    url?: string;
    enabled: boolean;
    namespace: string;
    middlewares: string[];
  }
  
  export interface MiddlewareConfig {
    id: string;
    name: string;
    type: 'request' | 'response' | 'bidirectional';
    code: string;
    enabled: boolean;
    priority: number;
    config: Record<string, any>;
  }
  
  export interface ChatSession {
    id: string;
    name: string;
    namespace: string;
    agentConfig: AgentConfig;
    messages: ChatMessage[];
    createdAt: Date;
  }
  
  export interface AgentConfig {
    systemPrompt: string;
    enabledTools: string[];
    temperature: number;
    maxTokens: number;
  }
  
  export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    toolCalls?: ToolCall[];
    timestamp: Date;
  }
  
  export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
    result?: any;
    duration?: number;
    error?: string;
  }
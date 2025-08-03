// packages/backend/src/types/index.ts
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
  toolFilter?: string[]; // Allow filtering specific tools
}

export interface MiddlewareConfig {
  id: string;
  name: string;
  type: 'request' | 'response' | 'bidirectional';
  code: string;
  enabled: boolean;
  priority: number;
  config: Record<string, any>;
  namespaces: string[]; // Which namespaces this middleware applies to
}

// NEW: Namespace configuration
export interface NamespaceConfig {
  id: string;
  name: string;
  description?: string;
  servers: string[]; // Array of server IDs
  middlewares: string[]; // Array of middleware IDs
  enabled: boolean;
  toolBlacklist?: string[]; // Tools to exclude from aggregation
  toolWhitelist?: string[]; // Only include these tools (if specified)
}

// NEW: Endpoint configuration for public hosting
export interface EndpointConfig {
  id: string;
  name: string;
  namespace: string; // Which namespace this endpoint exposes
  path: string; // URL path (e.g., '/api/mcp/production')
  transport: 'SSE' | 'HTTP' | 'WebSocket';
  auth: AuthConfig;
  enabled: boolean;
  rateLimit?: RateLimitConfig;
  cors?: CorsConfig;
  openApi?: boolean; // Whether to expose OpenAPI documentation
  createdAt: Date;
  lastAccessed?: Date;
}

// NEW: Authentication configuration
export interface AuthConfig {
  type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2';
  apiKeys?: string[]; // For api_key auth
  bearerTokens?: string[]; // For bearer auth
  basicAuth?: { username: string; password: string }[]; // For basic auth
  oauth2?: {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
  whitelist?: string[]; // IP whitelist
  blacklist?: string[]; // IP blacklist
}

// NEW: Rate limiting configuration
export interface RateLimitConfig {
  enabled: boolean;
  requests: number; // Number of requests
  window: number; // Time window in seconds
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// NEW: CORS configuration
export interface CorsConfig {
  enabled: boolean;
  origins: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
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

// NEW: MCP Server Instance for runtime management
export interface MCPServerInstance {
  id: string;
  config: MCPServerConfig;
  status: 'starting' | 'running' | 'stopped' | 'error';
  client: any; // MCP client instance
  lastHeartbeat?: Date;
  errorCount: number;
  startedAt?: Date;
}

// NEW: Endpoint analytics
export interface EndpointAnalytics {
  endpointId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestAt?: Date;
  topTools: { name: string; count: number }[];
}

// NEW: System health status
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    database: 'up' | 'down';
    mcpServers: 'up' | 'down' | 'partial';
    endpoints: 'up' | 'down' | 'partial';
  };
  uptime: number;
  version: string;
  lastCheck: Date;
}
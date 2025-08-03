-- Enhanced schema migration for MCP-Orchestrator with endpoints and namespaces

-- Servers table (enhanced)
CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('STDIO', 'HTTP')),
  command TEXT,
  args TEXT, -- JSON array as text
  url TEXT,
  enabled INTEGER DEFAULT 1,
  namespace TEXT NOT NULL,
  middlewares TEXT DEFAULT '[]', -- JSON array of middleware IDs
  tool_filter TEXT DEFAULT '[]', -- JSON array of allowed tool names
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Middlewares table (enhanced)
CREATE TABLE IF NOT EXISTS middlewares (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('request', 'response', 'bidirectional')),
  code TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 100,
  config TEXT NOT NULL DEFAULT '{}', -- JSON object as text
  namespaces TEXT DEFAULT '["default"]', -- JSON array of namespace IDs
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Namespaces table (NEW)
CREATE TABLE IF NOT EXISTS namespaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  tool_whitelist TEXT DEFAULT '[]', -- JSON array of allowed tool names
  tool_blacklist TEXT DEFAULT '[]', -- JSON array of blocked tool names
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Endpoints table (NEW)
CREATE TABLE IF NOT EXISTS endpoints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  namespace TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  transport TEXT NOT NULL CHECK (transport IN ('SSE', 'HTTP', 'WebSocket')),
  auth_config TEXT NOT NULL DEFAULT '{"type":"none"}', -- JSON object
  enabled INTEGER DEFAULT 1,
  rate_limit_config TEXT DEFAULT '{"enabled":false}', -- JSON object
  cors_config TEXT DEFAULT '{"enabled":true,"origins":["*"]}', -- JSON object
  openapi_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_accessed TEXT,
  FOREIGN KEY (namespace) REFERENCES namespaces(id)
);

-- Endpoint analytics table (NEW)
CREATE TABLE IF NOT EXISTS endpoint_analytics (
  endpoint_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  total_response_time INTEGER DEFAULT 0, -- Sum of all response times in ms
  top_tools TEXT DEFAULT '[]', -- JSON array of {name, count}
  PRIMARY KEY (endpoint_id, date),
  FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
);

-- Request logs table (NEW)
CREATE TABLE IF NOT EXISTS request_logs (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  method TEXT NOT NULL,
  tool_name TEXT,
  request_size INTEGER,
  response_time INTEGER, -- in milliseconds
  status_code INTEGER,
  error_message TEXT,
  client_ip TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
);

-- Chat sessions table (enhanced)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  namespace TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  enabled_tools TEXT DEFAULT '[]', -- JSON array
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (namespace) REFERENCES namespaces(id)
);

-- Chat messages table (unchanged)
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls TEXT, -- JSON array
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Server health table (NEW)
CREATE TABLE IF NOT EXISTS server_health (
  server_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('starting', 'running', 'stopped', 'error')),
  last_heartbeat TEXT,
  error_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT,
  PRIMARY KEY (server_id),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

-- System settings table (NEW)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default namespaces
INSERT OR IGNORE INTO namespaces (id, name, description) VALUES
  ('default', 'Default', 'Default namespace for development and testing'),
  ('development', 'Development', 'Development environment namespace'),
  ('production', 'Production', 'Production environment namespace');

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
  ('version', '1.0.0', 'System version'),
  ('max_endpoints_per_namespace', '10', 'Maximum number of endpoints per namespace'),
  ('default_rate_limit', '{"requests": 100, "window": 60}', 'Default rate limit configuration'),
  ('log_retention_days', '30', 'Number of days to retain request logs'),
  ('analytics_retention_days', '90', 'Number of days to retain analytics data');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_servers_namespace ON servers(namespace);
CREATE INDEX IF NOT EXISTS idx_servers_enabled ON servers(enabled);
CREATE INDEX IF NOT EXISTS idx_middlewares_namespaces ON middlewares(namespaces);
CREATE INDEX IF NOT EXISTS idx_middlewares_enabled ON middlewares(enabled);
CREATE INDEX IF NOT EXISTS idx_endpoints_namespace ON endpoints(namespace);
CREATE INDEX IF NOT EXISTS idx_endpoints_path ON endpoints(path);
CREATE INDEX IF NOT EXISTS idx_endpoints_enabled ON endpoints(enabled);
CREATE INDEX IF NOT EXISTS idx_request_logs_endpoint_id ON request_logs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_endpoint_analytics_date ON endpoint_analytics(date);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_namespace ON chat_sessions(namespace);

-- Create triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_servers_timestamp 
  AFTER UPDATE ON servers
  BEGIN
    UPDATE servers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_middlewares_timestamp 
  AFTER UPDATE ON middlewares
  BEGIN
    UPDATE middlewares SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_namespaces_timestamp 
  AFTER UPDATE ON namespaces
  BEGIN
    UPDATE namespaces SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_endpoints_timestamp 
  AFTER UPDATE ON endpoints
  BEGIN
    UPDATE endpoints SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_chat_sessions_timestamp 
  AFTER UPDATE ON chat_sessions
  BEGIN
    UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Create trigger to clean up old logs automatically
CREATE TRIGGER IF NOT EXISTS cleanup_old_request_logs
  AFTER INSERT ON request_logs
  BEGIN
    DELETE FROM request_logs 
    WHERE created_at < datetime('now', '-30 days');
  END;

-- Create trigger to update endpoint analytics
CREATE TRIGGER IF NOT EXISTS update_endpoint_analytics
  AFTER INSERT ON request_logs
  BEGIN
    INSERT OR REPLACE INTO endpoint_analytics (
      endpoint_id, 
      date, 
      total_requests,
      successful_requests,
      failed_requests,
      total_response_time
    )
    SELECT 
      NEW.endpoint_id,
      date(NEW.created_at),
      COALESCE(ea.total_requests, 0) + 1,
      COALESCE(ea.successful_requests, 0) + CASE WHEN NEW.status_code < 400 THEN 1 ELSE 0 END,
      COALESCE(ea.failed_requests, 0) + CASE WHEN NEW.status_code >= 400 THEN 1 ELSE 0 END,
      COALESCE(ea.total_response_time, 0) + COALESCE(NEW.response_time, 0)
    FROM (
      SELECT * FROM endpoint_analytics 
      WHERE endpoint_id = NEW.endpoint_id AND date = date(NEW.created_at)
    ) ea;
  END;
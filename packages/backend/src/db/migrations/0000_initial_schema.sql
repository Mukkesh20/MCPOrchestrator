-- Initial schema migration for MCP-Orchestrator

-- Servers table
CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  command TEXT,
  args TEXT,
  url TEXT,
  enabled INTEGER DEFAULT 1,
  namespace TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Middlewares table
CREATE TABLE IF NOT EXISTS middlewares (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  code TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 100,
  config TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  namespace TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  enabled_tools TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

-- Insert default namespaces
INSERT OR IGNORE INTO servers (id, name, type, enabled, namespace)
VALUES
  ('default-namespace', 'Default Namespace', 'NAMESPACE', 1, 'default'),
  ('development-namespace', 'Development Namespace', 'NAMESPACE', 1, 'development'),
  ('production-namespace', 'Production Namespace', 'NAMESPACE', 1, 'production');

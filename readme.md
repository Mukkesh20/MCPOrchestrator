# Enhanced MCP-Orchestrator

An advanced MCP (Model Context Protocol) proxy with middleware support, dynamic server generation, and a chat playground. Group MCP servers into namespaces, host them as NowMCPOrchestrator, and assign public endpoints (SSE or Streamable HTTP), with auth. One-click to switch a namespace for an endpoint.
Generally developers can use NowMCPOrchestratoras infrastructure to host dynamically composed MCP servers through a unified endpoint, and build agents on top of it.

## Features

- 🔄 **MCP Server Aggregation**: Combine multiple MCP servers into unified namespaces
- Group MCP servers into namespaces, host them as meta-MCPs, and assign public endpoints (SSE or Streamable HTTP), with auth. One-click to switch a namespace for an endpoint.
- Use as enhanced MCP inspector with saved server configs, and inspect your NowMCPOrchestrator endpoints in house to see if it works or not.
- 🛠️ **Advanced Middleware**: Custom request/response transformations with code editor
- 💬 **Chat Playground**: Interactive testing environment with tool integration
- 🎯 **Dynamic Management**: Hot-reload servers and middleware without restarts
- 🚀 **Modern Stack**: React frontend with TypeScript and tRPC APIs
- 📦 **No Docker**: Simple development setup with just Node.js

  🏷️ NowMCPOrchestrator Namespace
- Group one or more MCP servers into a namespace
- Enable/disable MCP servers or at tool level
- Apply middlewares to MCP requests and responses

🌐 NowMCPOrchestrator Endpoint
- Create endpoints and assign namespace to endpoints
- Multiple MCP servers in the namespace will be aggregated and emitted as a NowMCPOrchestrator endpoint
- Choose auth level and strategy
- Host through SSE or Streamable HTTP transports in MCP and OpenAPI endpoints for clients like Open WebUI
  
⚙️ Middleware
- Intercepts and transforms MCP requests and responses at namespace level
- Built-in example: "Filter inactive tools" - optimizes tool context for LLMs
- Future ideas: tool logging, error traces, validation, scanning

🔍 Inspector
Similar to the official MCP inspector, but with saved server configs - NowMCPOrchestrator automatically creates configurations so you can debug NowMCPOrchestrator endpoints immediately.

## Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/enhanced-MCP-Orchestrator.git
cd enhanced-MCP-Orchestrator

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

This will start:
- Backend on http://localhost:3001
- Frontend on http://localhost:3000

### Usage

1. **Add MCP Servers**: Go to the Servers tab and configure your MCP servers
2. **Create Middlewares**: Use the Middleware Builder to add custom logic
3. **Test with Chat**: Use the Chat Playground to interact with your tools
4. **Monitor**: Check the Dashboard for system overview

## Architecture

- **Backend**: Express.js + tRPC for type-safe APIs
- **Frontend**: React + TypeScript + Tailwind CSS
- **MCP Integration**: Official MCP SDK for server communication
- **Middleware Engine**: Custom execution environment for transformations
- **Process Management**: Built-in lifecycle management for MCP servers

## Development

```bash
# Backend only
pnpm dev:backend

# Frontend only  
pnpm dev:frontend

# Build for production
pnpm build

# Start production server
pnpm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

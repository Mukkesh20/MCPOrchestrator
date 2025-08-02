# Enhanced MCP-Orchestrator

An advanced MCP (Model Context Protocol) proxy with middleware support, dynamic server generation, and a chat playground.

## Features

- 🔄 **MCP Server Aggregation**: Combine multiple MCP servers into unified namespaces
- 🛠️ **Advanced Middleware**: Custom request/response transformations with code editor
- 💬 **Chat Playground**: Interactive testing environment with tool integration
- 🎯 **Dynamic Management**: Hot-reload servers and middleware without restarts
- 🚀 **Modern Stack**: React frontend with TypeScript and tRPC APIs
- 📦 **No Docker**: Simple development setup with just Node.js

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
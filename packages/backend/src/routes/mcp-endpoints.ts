// packages/backend/src/routes/mcp-endpoints.ts
import { Router, Request, Response } from 'express';
import { EndpointManager } from '../services/endpoint-manager.js';
import { MCPProxy } from '../services/mcp-proxy.js';
import { z } from 'zod';

const router = Router();

// Initialize services
const mcpProxy = new MCPProxy();
const endpointManager = new EndpointManager(mcpProxy);

// MCP Request/Response schemas
const mcpRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.any()).optional()
});

const mcpListToolsRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.literal('tools/list'),
  params: z.object({}).optional()
});

const mcpCallToolRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.any()).optional()
  })
});

// Apply endpoint middleware to all routes
router.use('*', endpointManager.createEndpointMiddleware());

// Handle MCP over HTTP
router.post('*', async (req: Request, res: Response) => {
  try {
    const endpoint = req.mcpEndpoint;
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Parse and validate MCP request
    const mcpRequest = mcpRequestSchema.parse(req.body);
    
    console.log(`📥 MCP ${mcpRequest.method} request to ${endpoint.name}`);

    let response: any;

    switch (mcpRequest.method) {
      case 'tools/list':
        response = await handleToolsList(endpoint.namespace, mcpRequest.id);
        break;
        
      case 'tools/call':
        const callRequest = mcpCallToolRequestSchema.parse(req.body);
        response = await handleToolCall(
          endpoint.namespace, 
          callRequest.params.name,
          callRequest.params.arguments || {},
          mcpRequest.id
        );
        break;
        
      case 'resources/list':
        response = await handleResourcesList(endpoint.namespace, mcpRequest.id);
        break;
        
      case 'prompts/list':
        response = await handlePromptsList(endpoint.namespace, mcpRequest.id);
        break;
        
      default:
        response = {
          jsonrpc: '2.0',
          id: mcpRequest.id,
          error: {
            code: -32601,
            message: `Method not found: ${mcpRequest.method}`
          }
        };
    }

    // Set appropriate headers based on transport type
    if (endpoint.transport === 'SSE') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
    } else {
      res.json(response);
    }

  } catch (error) {
    console.error('MCP endpoint error:', error);
    
    const errorResponse = {
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: error instanceof z.ZodError ? -32602 : -32603,
        message: error instanceof Error ? error.message : 'Internal error',
        data: error instanceof z.ZodError ? error.errors : undefined
      }
    };

    res.status(500).json(errorResponse);
  }
});

// Handle Server-Sent Events for real-time MCP
router.get('*/sse', (req: Request, res: Response) => {
  const endpoint = req.mcpEndpoint;
  if (!endpoint || endpoint.transport !== 'SSE') {
    return res.status(404).json({ error: 'SSE endpoint not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    endpoint: endpoint.name,
    namespace: endpoint.namespace,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
    console.log(`🔌 SSE connection closed for ${endpoint.name}`);
  });
});

// OpenAPI documentation endpoint
router.get('*/openapi.json', async (req: Request, res: Response) => {
  try {
    const endpoint = req.mcpEndpoint;
    if (!endpoint || !endpoint.openApi) {
      return res.status(404).json({ error: 'OpenAPI documentation not enabled' });
    }

    const tools = await mcpProxy.aggregateServers(endpoint.namespace);
    
    const openApiSpec = generateOpenApiSpec(endpoint, tools.tools);
    res.json(openApiSpec);
    
  } catch (error) {
    console.error('OpenAPI generation error:', error);
    res.status(500).json({ error: 'Failed to generate OpenAPI specification' });
  }
});

// Health check for individual endpoints
router.get('*/health', (req: Request, res: Response) => {
  const endpoint = req.mcpEndpoint;
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }

  res.json({
    status: endpoint.enabled ? 'healthy' : 'disabled',
    endpoint: endpoint.name,
    namespace: endpoint.namespace,
    transport: endpoint.transport,
    lastAccessed: endpoint.lastAccessed,
    timestamp: new Date().toISOString()
  });
});

// Helper functions
async function handleToolsList(namespace: string, requestId: any) {
  try {
    const aggregated = await mcpProxy.aggregateServers(namespace);
    
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        tools: aggregated.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      }
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32603,
        message: `Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }
}

async function handleToolCall(namespace: string, toolName: string, args: Record<string, any>, requestId: any) {
  try {
    const result = await mcpProxy.callTool(namespace, toolName, args);
    
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }
        ]
      }
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32603,
        message: `Tool call failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }
}

async function handleResourcesList(namespace: string, requestId: any) {
  try {
    const aggregated = await mcpProxy.aggregateServers(namespace);
    
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        resources: aggregated.resources || []
      }
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32603,
        message: `Failed to list resources: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }
}

async function handlePromptsList(namespace: string, requestId: any) {
  try {
    const aggregated = await mcpProxy.aggregateServers(namespace);
    
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        prompts: aggregated.prompts || []
      }
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32603,
        message: `Failed to list prompts: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }
}

function generateOpenApiSpec(endpoint: any, tools: any[]) {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: `${endpoint.name} MCP API`,
      version: '1.0.0',
      description: `MCP endpoint for namespace: ${endpoint.namespace}`
    },
    servers: [
      {
        url: endpoint.path,
        description: `${endpoint.name} endpoint`
      }
    ],
    paths: {
      '/': {
        post: {
          summary: 'MCP JSON-RPC endpoint',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jsonrpc: { type: 'string', enum: ['2.0'] },
                    id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                    method: { 
                      type: 'string',
                      enum: ['tools/list', 'tools/call', 'resources/list', 'prompts/list']
                    },
                    params: { type: 'object' }
                  },
                  required: ['jsonrpc', 'id', 'method']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'MCP Response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      jsonrpc: { type: 'string', enum: ['2.0'] },
                      id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                      result: { type: 'object' },
                      error: {
                        type: 'object',
                        properties: {
                          code: { type: 'number' },
                          message: { type: 'string' },
                          data: { type: 'object' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/health': {
        get: {
          summary: 'Endpoint health check',
          responses: {
            '200': {
              description: 'Health status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      endpoint: { type: 'string' },
                      namespace: { type: 'string' },
                      transport: { type: 'string' },
                      timestamp: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        Tool: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            inputSchema: { type: 'object' }
          }
        }
      },
      securitySchemes: endpoint.auth.type !== 'none' ? {
        ...(endpoint.auth.type === 'api_key' && {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        }),
        ...(endpoint.auth.type === 'bearer' && {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer'
          }
        }),
        ...(endpoint.auth.type === 'basic' && {
          BasicAuth: {
            type: 'http',
            scheme: 'basic'
          }
        })
      } : {}
    },
    security: endpoint.auth.type !== 'none' ? [
      ...(endpoint.auth.type === 'api_key' ? [{ ApiKeyAuth: [] }] : []),
      ...(endpoint.auth.type === 'bearer' ? [{ BearerAuth: [] }] : []),
      ...(endpoint.auth.type === 'basic' ? [{ BasicAuth: [] }] : [])
    ] : []
  };

  // Add tool-specific documentation
  if (tools.length > 0) {
    spec.info.description += `\n\nAvailable tools: ${tools.map(t => t.name).join(', ')}`;
  }

  return spec;
}

export default router;
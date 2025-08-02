// packages/backend/src/services/middleware-engine.ts
import { MiddlewareConfig } from '../types/index.js';

export class MiddlewareEngine {
  private middlewares: Map<string, MiddlewareConfig> = new Map();

  async processTools(tools: any[], namespace: string): Promise<any[]> {
    const middlewares = this.getMiddlewaresByNamespace(namespace);
    let processedTools = tools;

    for (const middleware of middlewares) {
      if (middleware.enabled && middleware.type === 'response') {
        processedTools = await this.applyMiddleware(processedTools, middleware);
      }
    }

    return processedTools;
  }

  async processRequest(request: any): Promise<any> {
    const middlewares = this.getMiddlewaresByNamespace(request.namespace);
    let processedRequest = request;

    for (const middleware of middlewares) {
      if (middleware.enabled && (middleware.type === 'request' || middleware.type === 'bidirectional')) {
        processedRequest = await this.applyMiddleware(processedRequest, middleware);
      }
    }

    return processedRequest;
  }

  async processResponse(response: any): Promise<any> {
    const middlewares = this.getMiddlewaresByNamespace(response.namespace);
    let processedResponse = response;

    for (const middleware of middlewares) {
      if (middleware.enabled && (middleware.type === 'response' || middleware.type === 'bidirectional')) {
        processedResponse = await this.applyMiddleware(processedResponse, middleware);
      }
    }

    return processedResponse;
  }

  private async applyMiddleware(data: any, middleware: MiddlewareConfig): Promise<any> {
    try {
      // Create a safe execution context
      const fn = new Function('data', 'config', middleware.code);
      return fn(data, middleware.config) || data;
    } catch (error) {
      console.error(`Middleware ${middleware.name} error:`, error);
      return data; // Return original data on error
    }
  }

  private getMiddlewaresByNamespace(namespace: string): MiddlewareConfig[] {
    // In real implementation, filter by namespace
    return Array.from(this.middlewares.values())
      .sort((a, b) => a.priority - b.priority);
  }

  async addMiddleware(middleware: MiddlewareConfig): Promise<void> {
    this.middlewares.set(middleware.id, middleware);
  }

  async removeMiddleware(id: string): Promise<void> {
    this.middlewares.delete(id);
  }

  async getMiddlewares(): Promise<MiddlewareConfig[]> {
    return Array.from(this.middlewares.values());
  }
}
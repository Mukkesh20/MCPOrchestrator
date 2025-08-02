// packages/frontend/src/components/MiddlewareBuilder.tsx
import React, { useState } from 'react';
import { trpc } from '../utils/trpc';
import Editor from '@monaco-editor/react';
import { Trash2, Play, Pause, Save } from 'lucide-react';

const MiddlewareBuilder = () => {
  const [newMiddleware, setNewMiddleware] = useState({
    name: '',
    type: 'request' as 'request' | 'response' | 'bidirectional',
    code: `/**
 * MCP Middleware Function
 * @param {object} data - The data to transform (request or response)
 * @param {object} config - Middleware configuration
 * @returns {object} - Transformed data
 */
function transform(data, config) {
  // Example: Add timestamp to requests
  if (data.tool) {
    data.timestamp = new Date().toISOString();
  }
  
  // Example: Log all interactions
  console.log('Middleware processing:', data);
  
  return data;
}

// Return the result
return transform(data, config);`,
    priority: 100,
    config: JSON.stringify({ 
      enabled: true,
      logLevel: 'info',
      timeout: 5000 
    }, null, 2)
  });

  const middlewaresQuery = trpc.middlewares.list.useQuery();
  
  const createMiddlewareMutation = trpc.middlewares.create.useMutation({
    onSuccess: () => {
      middlewaresQuery.refetch();
      setNewMiddleware({
        ...newMiddleware,
        name: '',
        code: `/**
 * MCP Middleware Function
 * @param {object} data - The data to transform (request or response)
 * @param {object} config - Middleware configuration
 * @returns {object} - Transformed data
 */
function transform(data, config) {
  // Your middleware code here
  return data;
}

// Return the result
return transform(data, config);`
      });
    },
    onError: (error) => {
      alert(`Failed to create middleware: ${error.message}`);
    }
  });

  const updateMiddlewareMutation = trpc.middlewares.update.useMutation({
    onSuccess: () => {
      middlewaresQuery.refetch();
    },
    onError: (error) => {
      alert(`Failed to update middleware: ${error.message}`);
    }
  });

  const deleteMiddlewareMutation = trpc.middlewares.delete.useMutation({
    onSuccess: () => {
      middlewaresQuery.refetch();
    },
    onError: (error) => {
      alert(`Failed to delete middleware: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMiddleware.name.trim()) {
      alert('Please enter a middleware name');
      return;
    }

    if (!newMiddleware.code.trim()) {
      alert('Please enter middleware code');
      return;
    }

    try {
      const config = JSON.parse(newMiddleware.config);
      createMiddlewareMutation.mutate({
        name: newMiddleware.name,
        type: newMiddleware.type,
        code: newMiddleware.code,
        priority: newMiddleware.priority,
        config
      });
    } catch (error) {
      alert('Invalid JSON configuration');
    }
  };

  const handleToggleMiddleware = (id: string, enabled: boolean) => {
    updateMiddlewareMutation.mutate({ id, enabled: !enabled });
  };

  const handleDeleteMiddleware = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete middleware "${name}"?`)) {
      deleteMiddlewareMutation.mutate({ id });
    }
  };

  const middlewareTemplates = {
    request: `/**
 * Request Middleware - Transform incoming requests
 */
function transform(data, config) {
  // Add request ID for tracking
  data.requestId = crypto.randomUUID();
  
  // Add authentication headers if needed
  if (config.addAuth && config.apiKey) {
    data.headers = data.headers || {};
    data.headers['Authorization'] = \`Bearer \${config.apiKey}\`;
  }
  
  // Log request for debugging
  if (config.logLevel === 'debug') {
    console.log('Request:', JSON.stringify(data, null, 2));
  }
  
  return data;
}

return transform(data, config);`,
    response: `/**
 * Response Middleware - Transform outgoing responses
 */
function transform(data, config) {
  // Add response metadata
  data.processedAt = new Date().toISOString();
  data.processingTime = Date.now() - (data.startTime || Date.now());
  
  // Filter sensitive information
  if (config.filterSensitive) {
    const sensitiveFields = config.sensitiveFields || ['password', 'token', 'key'];
    sensitiveFields.forEach(field => {
      if (data.result && data.result[field]) {
        data.result[field] = '[FILTERED]';
      }
    });
  }
  
  // Log response for debugging
  if (config.logLevel === 'debug') {
    console.log('Response:', JSON.stringify(data, null, 2));
  }
  
  return data;
}

return transform(data, config);`,
    bidirectional: `/**
 * Bidirectional Middleware - Transform both requests and responses
 */
function transform(data, config) {
  // Detect if this is a request or response
  const isRequest = data.tool !== undefined;
  const isResponse = data.result !== undefined;
  
  if (isRequest) {
    // Request processing
    data.requestId = crypto.randomUUID();
    data.startTime = Date.now();
    
    // Rate limiting
    if (config.rateLimit) {
      // Implementation would check rate limits here
    }
    
    console.log(\`Processing request: \${data.tool}\`);
  } else if (isResponse) {
    // Response processing
    data.processedAt = new Date().toISOString();
    
    // Cache responses if configured
    if (config.cacheResponses && data.result) {
      // Implementation would cache the response here
    }
    
    console.log(\`Processing response for: \${data.tool}\`);
  }
  
  return data;
}

return transform(data, config);`
  };

  const loadTemplate = (type: string) => {
    setNewMiddleware({
      ...newMiddleware,
      code: middlewareTemplates[type as keyof typeof middlewareTemplates]
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Middleware Builder</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and manage custom middleware for request/response transformations
        </p>
      </div>

      {/* Create New Middleware Form */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Create New Middleware
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Build custom logic to transform requests and responses
          </p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="form-label">
                    Middleware Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newMiddleware.name}
                    onChange={(e) => setNewMiddleware({ ...newMiddleware, name: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Request Logger"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="type" className="form-label">
                    Type
                  </label>
                  <select
                    id="type"
                    value={newMiddleware.type}
                    onChange={(e) => {
                      const type = e.target.value as 'request' | 'response' | 'bidirectional';
                      setNewMiddleware({ ...newMiddleware, type });
                    }}
                    className="form-select"
                  >
                    <option value="request">Request Only</option>
                    <option value="response">Response Only</option>
                    <option value="bidirectional">Bidirectional</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="form-label">
                    Priority (lower = runs first)
                  </label>
                  <input
                    type="number"
                    id="priority"
                    value={newMiddleware.priority}
                    onChange={(e) => setNewMiddleware({ ...newMiddleware, priority: parseInt(e.target.value) })}
                    className="form-input"
                    min="1"
                    max="1000"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Load Template
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => loadTemplate('request')}
                      className="btn-secondary text-xs"
                    >
                      Request Template
                    </button>
                    <button
                      type="button"
                      onClick={() => loadTemplate('response')}
                      className="btn-secondary text-xs"
                    >
                      Response Template
                    </button>
                    <button
                      type="button"
                      onClick={() => loadTemplate('bidirectional')}
                      className="btn-secondary text-xs"
                    >
                      Bidirectional Template
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="code" className="form-label">
                  Middleware Code (JavaScript)
                </label>
                <div className="mt-1 monaco-editor-container">
                  <Editor
                    height="400px"
                    language="javascript"
                    value={newMiddleware.code}
                    onChange={(value) => setNewMiddleware({ ...newMiddleware, code: value || '' })}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      theme: 'vs-light',
                      tabSize: 2,
                      insertSpaces: true
                    }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="config" className="form-label">
                  Configuration (JSON)
                </label>
                <div className="mt-1 monaco-editor-container">
                  <Editor
                    height="150px"
                    language="json"
                    value={newMiddleware.config}
                    onChange={(value) => setNewMiddleware({ ...newMiddleware, config: value || '{}' })}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      theme: 'vs-light',
                      tabSize: 2,
                      insertSpaces: true
                    }}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createMiddlewareMutation.isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createMiddlewareMutation.isLoading ? 'Creating...' : 'Create Middleware'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Existing Middlewares */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Existing Middlewares</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage your deployed middleware functions
          </p>
        </div>
        <div className="border-t border-gray-200">
          {middlewaresQuery.isLoading ? (
            <div className="px-4 py-5 sm:p-6 text-center">
              <div className="spinner mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading middlewares...</p>
            </div>
          ) : middlewaresQuery.error ? (
            <div className="px-4 py-5 sm:p-6">
              <div className="alert alert-error">
                Error loading middlewares: {middlewaresQuery.error.message}
              </div>
            </div>
          ) : middlewaresQuery.data?.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
              <p>No middlewares defined yet.</p>
              <p className="text-sm">Create one using the form above to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {middlewaresQuery.data?.map((middleware: any) => (
                <div key={middleware.id} className="px-4 py-6 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`h-3 w-3 rounded-full ${
                        middleware.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{middleware.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className={`status-indicator ${
                            middleware.type === 'request' ? 'bg-blue-100 text-blue-800' :
                            middleware.type === 'response' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {middleware.type}
                          </span>
                          <span>Priority: {middleware.priority}</span>
                          <span>{middleware.enabled ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleMiddleware(middleware.id, middleware.enabled)}
                        className={`inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 ${
                          updateMiddlewareMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={updateMiddlewareMutation.isLoading}
                        title={middleware.enabled ? 'Disable' : 'Enable'}
                      >
                        {middleware.enabled ? (
                          <Pause className="h-4 w-4 text-gray-700" />
                        ) : (
                          <Play className="h-4 w-4 text-gray-700" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMiddleware(middleware.id, middleware.name)}
                        className={`inline-flex items-center p-2 border border-red-300 rounded-md shadow-sm bg-white hover:bg-red-50 ${
                          deleteMiddlewareMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={deleteMiddlewareMutation.isLoading}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-700" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Configuration preview */}
                  <div className="mt-4 text-sm text-gray-600">
                    <details>
                      <summary className="cursor-pointer font-medium hover:text-gray-900">
                        View Configuration
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-50 rounded-md text-xs overflow-x-auto">
                        {JSON.stringify(middleware.config, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MiddlewareBuilder;
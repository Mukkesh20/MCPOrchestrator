import React, { useState } from 'react';
import { trpc } from '../utils/trpc';
import Editor from '@monaco-editor/react';

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
  // Your middleware code here
  return data;
}

// Return the result
return transform(data, config);`,
    priority: 100,
    config: JSON.stringify({ enabled: true }, null, 2)
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
    }
  });
  const updateMiddlewareMutation = trpc.middlewares.update.useMutation({
    onSuccess: () => {
      middlewaresQuery.refetch();
    }
  });
  const deleteMiddlewareMutation = trpc.middlewares.delete.useMutation({
    onSuccess: () => {
      middlewaresQuery.refetch();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      alert('Invalid JSON in config field');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Middleware Builder</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and manage middleware to transform MCP requests and responses
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Create New Middleware</h3>
          <div className="mt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Middleware Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="name"
                    required
                    value={newMiddleware.name}
                    onChange={(e) => setNewMiddleware({ ...newMiddleware, name: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <div className="mt-1">
                  <select
                    id="type"
                    value={newMiddleware.type}
                    onChange={(e) => setNewMiddleware({ ...newMiddleware, type: e.target.value as any })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="request">Request</option>
                    <option value="response">Response</option>
                    <option value="bidirectional">Bidirectional</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority (lower executes first)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="priority"
                    required
                    min="1"
                    max="1000"
                    value={newMiddleware.priority}
                    onChange={(e) => setNewMiddleware({ ...newMiddleware, priority: parseInt(e.target.value) })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Middleware Code
                </label>
                <div className="mt-1" style={{ height: '300px', border: '1px solid #e5e7eb' }}>
                  <Editor
                    height="300px"
                    language="javascript"
                    value={newMiddleware.code}
                    onChange={(value) => setNewMiddleware({ ...newMiddleware, code: value || '' })}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      scrollBeyondLastLine: false
                    }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="config" className="block text-sm font-medium text-gray-700">
                  Config (JSON)
                </label>
                <div className="mt-1" style={{ height: '120px', border: '1px solid #e5e7eb' }}>
                  <Editor
                    height="120px"
                    language="json"
                    value={newMiddleware.config}
                    onChange={(value) => setNewMiddleware({ ...newMiddleware, config: value || '{}' })}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      scrollBeyondLastLine: false
                    }}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={createMiddlewareMutation.isLoading}
                >
                  {createMiddlewareMutation.isLoading ? 'Creating...' : 'Create Middleware'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Existing Middlewares</h3>
        </div>
        <div className="border-t border-gray-200">
          {middlewaresQuery.isLoading ? (
            <div className="px-4 py-5 sm:p-6">Loading middlewares...</div>
          ) : middlewaresQuery.error ? (
            <div className="px-4 py-5 sm:p-6 text-red-500">
              Error loading middlewares: {middlewaresQuery.error.message}
            </div>
          ) : middlewaresQuery.data?.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-gray-500">
              No middlewares defined yet. Create one using the form above.
            </div>
          ) : (
            <ul role="list" className="divide-y divide-gray-200">
              {middlewaresQuery.data?.map((middleware: any) => (
                <li key={middleware.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full ${middleware.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <p className="ml-2 text-sm font-medium text-gray-900">{middleware.name}</p>
                      <span className="ml-2 inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {middleware.type}
                      </span>
                      <span className="ml-2 inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        Priority: {middleware.priority}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => updateMiddlewareMutation.mutate({ 
                          id: middleware.id, 
                          enabled: !middleware.enabled 
                        })}
                        className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        {middleware.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMiddlewareMutation.mutate({ id: middleware.id })}
                        className="inline-flex items-center rounded border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {middleware.enabled ? 'Active' : 'Inactive'} | Configuration: {JSON.stringify(middleware.config)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MiddlewareBuilder;

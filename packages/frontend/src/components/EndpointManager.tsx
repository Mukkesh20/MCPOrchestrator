// packages/frontend/src/components/EndpointManager.tsx
import React, { useState } from 'react';
import { trpc } from '../hooks/useTRPC';
import { Globe, Lock, Shield, Zap, Settings, Copy, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

interface EndpointFormData {
  name: string;
  namespace: string;
  path: string;
  transport: 'SSE' | 'HTTP' | 'WebSocket';
  auth: {
    type: 'none' | 'api_key' | 'bearer' | 'basic';
    apiKeys?: string[];
    bearerTokens?: string[];
    basicAuth?: Array<{ username: string; password: string }>;
    whitelist?: string[];
    blacklist?: string[];
  };
  enabled: boolean;
  rateLimit?: {
    enabled: boolean;
    requests: number;
    window: number;
  };
  cors?: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    headers: string[];
    credentials: boolean;
  };
  openApi: boolean;
}

export default function EndpointManager() {
  const [showCreateEndpoint, setShowCreateEndpoint] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [showSwitchNamespace, setShowSwitchNamespace] = useState<string | null>(null);

  const [newEndpoint, setNewEndpoint] = useState<EndpointFormData>({
    name: '',
    namespace: 'default',
    path: '/api/mcp/',
    transport: 'HTTP',
    auth: {
      type: 'none'
    },
    enabled: true,
    rateLimit: {
      enabled: false,
      requests: 100,
      window: 60
    },
    cors: {
      enabled: true,
      origins: ['*'],
      methods: ['GET', 'POST', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization'],
      credentials: false
    },
    openApi: true
  });

  const endpointsQuery = trpc.endpoints.list.useQuery();
  const namespacesQuery = trpc.namespaces.list.useQuery();
  interface AnalyticsSummary {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    activeEndpoints: number;
  }

  interface AnalyticsData {
    endpoints?: Array<{
      endpointId: string;
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
      lastRequestAt?: Date;
      topTools: Array<{ name: string; count: number }>;
    }>;
    summary?: AnalyticsSummary;
  }

  const analyticsQuery = trpc.system.analytics.useQuery() as { data?: AnalyticsData, isLoading: boolean, refetch: () => void };

  const createEndpoint = trpc.endpoints.create.useMutation({
    onSuccess: () => {
      endpointsQuery.refetch();
      setShowCreateEndpoint(false);
      setNewEndpoint({
        name: '',
        namespace: 'default',
        path: '/api/mcp/',
        transport: 'HTTP',
        auth: { type: 'none' },
        enabled: true,
        rateLimit: { enabled: false, requests: 100, window: 60 },
        cors: { enabled: true, origins: ['*'], methods: ['GET', 'POST', 'OPTIONS'], headers: ['Content-Type', 'Authorization'], credentials: false },
        openApi: true
      });
    },
    onError: (error) => {
      alert(`Failed to create endpoint: ${error.message}`);
    }
  });

  const updateEndpoint = trpc.endpoints.update.useMutation({
    onSuccess: () => {
      endpointsQuery.refetch();
    }
  });

  const deleteEndpoint = trpc.endpoints.delete.useMutation({
    onSuccess: () => {
      endpointsQuery.refetch();
      analyticsQuery.refetch();
    }
  });

  const switchNamespace = trpc.endpoints.switchNamespace.useMutation({
    onSuccess: () => {
      endpointsQuery.refetch();
      setShowSwitchNamespace(null);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEndpoint.mutate(newEndpoint);
  };

  const handleToggleEndpoint = (id: string, enabled: boolean) => {
    updateEndpoint.mutate({ id, enabled });
  };

  const handleDeleteEndpoint = (id: string) => {
    if (confirm('Are you sure you want to delete this endpoint?')) {
      deleteEndpoint.mutate({ id });
    }
  };

  const handleSwitchNamespace = (endpointId: string, namespaceId: string) => {
    switchNamespace.mutate({ endpointId, namespaceId });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const getAuthTypeIcon = (authType: string) => {
    switch (authType) {
      case 'none': return <Globe className="w-4 h-4 text-gray-400" />;
      case 'api_key': return <Lock className="w-4 h-4 text-blue-500" />;
      case 'bearer': return <Shield className="w-4 h-4 text-green-500" />;
      case 'basic': return <Settings className="w-4 h-4 text-yellow-500" />;
      default: return <Lock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransportBadge = (transport: string) => {
    const colors = {
      HTTP: 'bg-blue-100 text-blue-800',
      SSE: 'bg-green-100 text-green-800',
      WebSocket: 'bg-purple-100 text-purple-800'
    };
    return colors[transport as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Endpoint Manager</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage public MCP endpoints with authentication and monitoring
          </p>
        </div>
        <button
          onClick={() => setShowCreateEndpoint(true)}
          className="btn-primary"
        >
          <Zap className="w-4 h-4 mr-2" />
          Create Endpoint
        </button>
      </div>

      {/* Analytics Summary */}
      {analyticsQuery.data && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Analytics Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analyticsQuery.data?.summary ? analyticsQuery.data.summary.totalRequests : 
                  analyticsQuery.data?.endpoints?.reduce((sum, a) => sum + a.totalRequests, 0) || 0}
              </div>
              <div className="text-sm text-gray-500">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analyticsQuery.data?.summary ? analyticsQuery.data.summary.successRate?.toFixed(1) :
                  (() => {
                    const total = analyticsQuery.data?.endpoints?.reduce((sum, a) => sum + a.totalRequests, 0) || 0;
                    const success = analyticsQuery.data?.endpoints?.reduce((sum, a) => sum + a.successfulRequests, 0) || 0;
                    return total > 0 ? ((success / total) * 100).toFixed(1) : '0';
                  })()}%
              </div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {analyticsQuery.data?.summary ? analyticsQuery.data.summary.averageResponseTime :
                  (analyticsQuery.data?.endpoints?.length || 0) > 0 ?
                    Math.round(analyticsQuery.data?.endpoints?.reduce((sum, a) => sum + a.averageResponseTime, 0) || 0) / 
                    (analyticsQuery.data?.endpoints?.length || 1)
                  : 0}ms
              </div>
              <div className="text-sm text-gray-500">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {analyticsQuery.data?.summary ? analyticsQuery.data.summary.activeEndpoints :
                  analyticsQuery.data?.endpoints?.filter(a => a.lastRequestAt && 
                    new Date().getTime() - new Date(a.lastRequestAt as Date).getTime() < 24 * 60 * 60 * 1000
                  ).length || 0}
              </div>
              <div className="text-sm text-gray-500">Active Endpoints</div>
            </div>
          </div>
        </div>
      )}

      {/* Endpoints List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {endpointsQuery.data?.map((endpoint) => {
            // Find analytics data for this endpoint (if any)
            const endpoints = analyticsQuery.data?.endpoints || [];
            const analytics = endpoints.find(a => a.endpointId === endpoint.id);
            
            return (
              <li key={endpoint.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {endpoint.enabled ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {endpoint.name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransportBadge(endpoint.transport)}`}>
                            {endpoint.transport}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Globe className="w-4 h-4" />
                            <span>Namespace: {endpoint.namespace}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            {getAuthTypeIcon(endpoint.auth.type)}
                            <span>{endpoint.auth.type}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {analytics && (
                        <div className="text-right text-sm text-gray-500">
                          <div>{analytics.totalRequests} requests</div>
                          <div>{analytics.averageResponseTime}ms avg</div>
                        </div>
                      )}
                      <div className="flex space-x-1">
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}${endpoint.path}`)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy endpoint URL"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {endpoint.openApi && (
                          <button
                            onClick={() => window.open(`${endpoint.path}/openapi.json`, '_blank')}
                            className="text-gray-400 hover:text-gray-600"
                            title="View OpenAPI spec"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowSwitchNamespace(endpoint.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Switch Namespace
                        </button>
                        <button
                          onClick={() => handleToggleEndpoint(endpoint.id, !endpoint.enabled)}
                          className={`text-sm ${endpoint.enabled ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {endpoint.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteEndpoint(endpoint.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <code className="px-2 py-1 bg-gray-100 rounded">{endpoint.path}</code>
                      {endpoint.rateLimit?.enabled && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          Rate Limited: {endpoint.rateLimit.requests}/{endpoint.rateLimit.window}s
                        </span>
                      )}
                      {endpoint.cors?.enabled && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          CORS Enabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Create Endpoint Modal */}
      {showCreateEndpoint && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Endpoint</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Endpoint Name</label>
                  <input
                    type="text"
                    value={newEndpoint.name}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Namespace</label>
                  <select
                    value={newEndpoint.namespace}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, namespace: e.target.value })}
                    className="form-select"
                  >
                    {namespacesQuery.data?.map((ns) => (
                      <option key={ns.id} value={ns.id}>{ns.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">URL Path</label>
                  <input
                    type="text"
                    value={newEndpoint.path}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, path: e.target.value })}
                    className="form-input"
                    placeholder="/api/mcp/my-endpoint"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Transport</label>
                  <select
                    value={newEndpoint.transport}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, transport: e.target.value as 'SSE' | 'HTTP' | 'WebSocket' })}
                    className="form-select"
                  >
                    <option value="HTTP">HTTP</option>
                    <option value="SSE">Server-Sent Events</option>
                    <option value="WebSocket">WebSocket</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Authentication</label>
                  <select
                    value={newEndpoint.auth.type}
                    onChange={(e) => setNewEndpoint({ 
                      ...newEndpoint, 
                      auth: { ...newEndpoint.auth, type: e.target.value as any }
                    })}
                    className="form-select"
                  >
                    <option value="none">No Authentication</option>
                    <option value="api_key">API Key</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>

                {newEndpoint.auth.type === 'api_key' && (
                  <div>
                    <label className="form-label">API Keys (one per line)</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Enter API keys, one per line"
                      onChange={(e) => setNewEndpoint({
                        ...newEndpoint,
                        auth: {
                          ...newEndpoint.auth,
                          apiKeys: e.target.value.split('\n').filter(k => k.trim())
                        }
                      })}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newEndpoint.rateLimit?.enabled || false}
                      onChange={(e) => setNewEndpoint({
                        ...newEndpoint,
                        rateLimit: {
                          ...newEndpoint.rateLimit!,
                          enabled: e.target.checked
                        }
                      })}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-sm">Enable Rate Limiting</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newEndpoint.openApi}
                      onChange={(e) => setNewEndpoint({ ...newEndpoint, openApi: e.target.checked })}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-sm">OpenAPI Docs</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={createEndpoint.isLoading}
                    className="btn-primary flex-1"
                  >
                    {createEndpoint.isLoading ? 'Creating...' : 'Create Endpoint'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateEndpoint(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Switch Namespace Modal */}
      {showSwitchNamespace && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Switch Namespace</h3>
              <div className="space-y-3">
                {namespacesQuery.data?.map((ns) => (
                  <button
                    key={ns.id}
                    onClick={() => handleSwitchNamespace(showSwitchNamespace, ns.id)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="font-medium">{ns.name}</div>
                    <div className="text-sm text-gray-500">{ns.serverCount} servers</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSwitchNamespace(null)}
                className="mt-4 w-full btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { trpc } from '../hooks/useTRPC';

const ServerManager = () => {
  const [showAddServer, setShowAddServer] = useState(false);
  // Define server type as a union type to avoid TypeScript errors
  type ServerType = 'STDIO' | 'HTTP';
  
  interface ServerFormData {
    name: string;
    type: ServerType;
    command: string;
    args: string;
    url: string;
    namespace: string;
  }

  const [newServer, setNewServer] = useState<ServerFormData>({
    name: '',
    type: 'STDIO',
    command: '',
    args: '',
    url: '',
    namespace: 'default',
  });

  const namespacesQuery = trpc.namespaces.list.useQuery();
  
  const serversQuery = trpc.servers.list.useQuery();
  const createServerMutation = trpc.servers.create.useMutation({
    onSuccess: () => {
      serversQuery.refetch();
      setShowAddServer(false);
      setNewServer({
        name: '',
        type: 'STDIO',
        command: '',
        args: '',
        url: '',
        namespace: 'default',
      });
    },
    onError: (error) => {
      console.error('Server creation error:', error);
      alert(`Failed to create server: ${error.message}`);
    }
  });
  
  const toggleServerMutation = trpc.servers.toggle.useMutation({
    onSuccess: () => {
      serversQuery.refetch();
    },
  });
  
  const deleteServerMutation = trpc.servers.delete.useMutation({
    onSuccess: () => {
      serversQuery.refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newServer.name.trim()) {
      alert('Server name is required');
      return;
    }
    
    if (!newServer.namespace.trim()) {
      alert('Namespace is required');
      return;
    }
    
    // Build the base payload
    const payload: any = {
      name: newServer.name.trim(),
      type: newServer.type,
      namespace: newServer.namespace.trim(),
    };
    
    // Add type-specific fields with proper validation
    if (newServer.type === 'STDIO') {
      if (!newServer.command.trim()) {
        alert('Command is required for STDIO servers');
        return;
      }
      payload.command = newServer.command.trim();
      
      // Handle args properly - filter out empty strings
      if (newServer.args.trim()) {
        payload.args = newServer.args.trim().split(/\s+/).filter(arg => arg.length > 0);
      } else {
        payload.args = []; // THIS WAS THE PROBLEM - was truncated as "payload.a"
      }
    } else if (newServer.type === 'HTTP') {
      if (!newServer.url.trim()) {
        alert('URL is required for HTTP servers');
        return;
      }
      try {
        new URL(newServer.url.trim()); // Validate URL format
        payload.url = newServer.url.trim();
      } catch (error) {
        alert('Please enter a valid URL');
        return;
      }
    }
    
    console.log('Submitting payload:', payload); // Debug log
    createServerMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MCP Servers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and configure MCP servers
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setShowAddServer(!showAddServer)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            {showAddServer ? 'Cancel' : 'Add Server'}
          </button>
        </div>
      </div>

      {showAddServer && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Add MCP Server</h3>
            <div className="mt-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Server Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="name"
                      required
                      value={newServer.name}
                      onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Server Type
                  </label>
                  <div className="mt-1">
                    <select
                      id="type"
                      value={newServer.type}
                      onChange={(e) => setNewServer({ ...newServer, type: e.target.value as ServerType })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="STDIO">STDIO (Local Process)</option>
                      <option value="HTTP">HTTP (Remote Server)</option>
                    </select>
                  </div>
                </div>

                {newServer.type === 'STDIO' ? (
                  <>
                    <div>
                      <label htmlFor="command" className="block text-sm font-medium text-gray-700">
                        Command
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="command"
                          required
                          value={newServer.command}
                          onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="python3"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="args" className="block text-sm font-medium text-gray-700">
                        Arguments (space separated)
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="args"
                          value={newServer.args}
                          onChange={(e) => setNewServer({ ...newServer, args: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="-m mcp_server"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                      Server URL
                    </label>
                    <div className="mt-1">
                      <input
                        type="url"
                        id="url"
                        required
                        value={newServer.url}
                        onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="https://example.com/mcp"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="namespace" className="block text-sm font-medium text-gray-700">
                    Namespace
                  </label>
                  <div className="mt-1">
                    <select
                      id="namespace"
                      value={newServer.namespace}
                      onChange={(e) => setNewServer({ ...newServer, namespace: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="default">Default</option>
                      <option value="development">Development</option>
                      <option value="production">Production</option>
                      {namespacesQuery.data?.map((ns: any) => (
                        !['default', 'development', 'production'].includes(ns.id) && (
                          <option key={ns.id} value={ns.id}>{ns.name}</option>
                        )
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddServer(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createServerMutation.isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createServerMutation.isLoading ? 'Creating...' : 'Create Server'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Configured Servers</h3>
          {serversQuery.isLoading ? (
            <div className="px-4 py-5 sm:p-6 text-gray-500">
              Loading servers...
            </div>
          ) : !serversQuery.data || serversQuery.data.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-gray-500">
              No servers configured yet. Add one using the button above.
            </div>
          ) : (
            <ul role="list" className="divide-y divide-gray-200">
              {serversQuery.data?.map((server: any) => (
                <li key={server.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full ${server.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <p className="ml-2 text-sm font-medium text-gray-900">{server.name}</p>
                      <span className="ml-2 inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {server.namespace}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => toggleServerMutation.mutate({ id: server.id, enabled: !server.enabled })}
                        className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        {server.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteServerMutation.mutate({ id: server.id })}
                        className="inline-flex items-center rounded border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {server.type === 'STDIO'
                      ? `${server.command} ${server.args?.join(' ') || ''}`
                      : server.url}
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

export default ServerManager;
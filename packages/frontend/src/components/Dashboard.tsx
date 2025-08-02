// packages/frontend/src/components/Dashboard.tsx
import React from 'react';
import { trpc } from '../utils/trpc';
import { Server, Cpu, MessageSquare, Zap } from 'lucide-react';

const Dashboard = () => {
  const serversQuery = trpc.servers.list.useQuery();
  const middlewaresQuery = trpc.middlewares.list.useQuery();
  const namespacesQuery = trpc.namespaces.list.useQuery();

  const stats = [
    {
      name: 'Active Servers',
      value: serversQuery.data?.filter(s => s.enabled).length || 0,
      total: serversQuery.data?.length || 0,
      icon: Server,
      color: 'bg-blue-500'
    },
    {
      name: 'Middlewares',
      value: middlewaresQuery.data?.filter(m => m.enabled).length || 0,
      total: middlewaresQuery.data?.length || 0,
      icon: Cpu,
      color: 'bg-green-500'
    },
    {
      name: 'Namespaces',
      value: namespacesQuery.data?.length || 0,
      total: namespacesQuery.data?.length || 0,
      icon: MessageSquare,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">MCP Orchestrator Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and manage your Model Context Protocol servers and middleware
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                      {stat.total !== stat.value && (
                        <span className="text-sm text-gray-500 ml-1">
                          / {stat.total}
                        </span>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            System Status
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Overview of your MCP infrastructure
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Server Status
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {serversQuery.isLoading ? (
                  'Loading...'
                ) : serversQuery.error ? (
                  <span className="text-red-500">Error loading servers</span>
                ) : (
                  <div className="space-y-1">
                    {serversQuery.data?.length === 0 ? (
                      <span className="text-gray-500">No servers configured</span>
                    ) : (
                      serversQuery.data?.map((server) => (
                        <div key={server.id} className="flex items-center space-x-2">
                          <div className={`h-2 w-2 rounded-full ${
                            server.enabled ? 'bg-green-400' : 'bg-gray-300'
                          }`}></div>
                          <span className="text-sm">
                            {server.name} ({server.namespace})
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Middleware Pipeline
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {middlewaresQuery.isLoading ? (
                  'Loading...'
                ) : middlewaresQuery.error ? (
                  <span className="text-red-500">Error loading middleware</span>
                ) : middlewaresQuery.data?.length === 0 ? (
                  <span className="text-gray-500">No middleware configured</span>
                ) : (
                  <div className="space-y-1">
                    {middlewaresQuery.data?.map((middleware) => (
                      <div key={middleware.id} className="flex items-center space-x-2">
                        <div className={`h-2 w-2 rounded-full ${
                          middleware.enabled ? 'bg-green-400' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-sm">
                          {middleware.name} ({middleware.type})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Quick Actions
          </h3>
          <div className="mt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/servers"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 hover:bg-gray-50 rounded-lg border border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                    <Server className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    Add Server
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Connect a new MCP server to your orchestrator
                  </p>
                </div>
              </a>

              <a
                href="/middlewares"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 hover:bg-gray-50 rounded-lg border border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                    <Cpu className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    Create Middleware
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Build custom request/response transformations
                  </p>
                </div>
              </a>

              <a
                href="/chat"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 hover:bg-gray-50 rounded-lg border border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                    <MessageSquare className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    Test Chat
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Test your tools in the chat playground
                  </p>
                </div>
              </a>

              <div className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 hover:bg-gray-50 rounded-lg border border-gray-300">
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                    <Zap className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    View Docs
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Learn about MCP protocol and best practices
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
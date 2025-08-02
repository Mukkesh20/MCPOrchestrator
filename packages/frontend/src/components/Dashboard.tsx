import { trpc } from '../utils/trpc';

// Define the namespace interface to use with query results
interface Namespace {
  id: string;
  name: string;
  serverCount: number;
}

const Dashboard = () => {
  // Type the query result using the Namespace interface
  const namespacesQuery = trpc.namespaces.list.useQuery<Namespace[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and manage your MCP servers and middleware
        </p>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Namespaces</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {namespacesQuery.isLoading ? (
              <p>Loading namespaces...</p>
            ) : namespacesQuery.error ? (
              <p className="text-red-500">Error loading namespaces: {namespacesQuery.error.message}</p>
            ) : (
              namespacesQuery.data?.map((namespace: Namespace) => (
                <div
                  key={namespace.id}
                  className="relative rounded-lg border border-gray-200 bg-white px-6 py-5 shadow-sm hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{namespace.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{namespace.serverCount} Servers</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">System Status</h2>
          <div className="mt-4">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-2 rounded-full">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              <div>
                <p className="text-sm font-medium">Backend Server</p>
                <p className="text-xs text-gray-500">Running on port 3001</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add New Server
            </button>
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Middleware
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

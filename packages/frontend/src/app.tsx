// packages/frontend/src/app.tsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, trpcClient } from './hooks/useTRPC';
import { trpc } from './utils/trpc';
import Dashboard from './components/Dashboard';
import ServerManager from './components/ServerManager';
import MiddlewareBuilder from './components/MiddlewareBuilder';
import ChatPlayground from './components/ChatPlayground';

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                  <div className="flex space-x-8">
                    <Link to="/" className="flex items-center px-3 py-2 text-sm font-medium">
                      Dashboard
                    </Link>
                    <Link to="/servers" className="flex items-center px-3 py-2 text-sm font-medium">
                      Servers
                    </Link>
                    <Link to="/middlewares" className="flex items-center px-3 py-2 text-sm font-medium">
                      Middlewares
                    </Link>
                    <Link to="/chat" className="flex items-center px-3 py-2 text-sm font-medium">
                      Chat Playground
                    </Link>
                  </div>
                </div>
              </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/servers" element={<ServerManager />} />
                <Route path="/middlewares" element={<MiddlewareBuilder />} />
                <Route path="/chat" element={<ChatPlayground />} />
              </Routes>
            </main>
          </div>
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
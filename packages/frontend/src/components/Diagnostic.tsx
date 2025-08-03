// packages/frontend/src/components/Diagnostic.tsx
import React, { useState, useEffect } from 'react';
import { trpc } from '../hooks/useTRPC';

const Diagnostic: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [backendMessage, setBackendMessage] = useState<string>('Checking backend connection...');
  const [trpcStatus, setTrpcStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [trpcMessage, setTrpcMessage] = useState<string>('Checking tRPC connection...');
  
  // Health check using standard fetch
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        console.log('Testing backend connection to http://localhost:3002/api/diagnostic');
        const response = await fetch('http://localhost:3002/api/diagnostic');
        if (!response.ok) {
          throw new Error(`Backend responded with status ${response.status}`);
        }
        const data = await response.json();
        setBackendStatus('success');
        setBackendMessage(`Connected to backend: ${JSON.stringify(data.message)}`);
      } catch (error) {
        console.error('Backend connection error:', error);
        setBackendStatus('error');
        setBackendMessage(`Error connecting to backend: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    checkBackendHealth();
  }, []);

  // Test tRPC connection
  const healthQuery = trpc.system.health.useQuery(undefined, {
    retry: false,
    onSuccess: (data) => {
      setTrpcStatus('success');
      setTrpcMessage(`tRPC connected successfully: ${data?.status || 'OK'}`);
    },
    onError: (error) => {
      console.error('tRPC connection error:', error);
      setTrpcStatus('error');
      setTrpcMessage(`Error with tRPC connection: ${error.message}`);
    }
  });

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">MCP Orchestrator Diagnostics</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Backend Connection Status</h2>
        <div className={`p-4 rounded-md ${
          backendStatus === 'checking' ? 'bg-yellow-100' : 
          backendStatus === 'success' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <div className="flex items-center">
            <div className={`w-4 h-4 rounded-full mr-2 ${
              backendStatus === 'checking' ? 'bg-yellow-500' : 
              backendStatus === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <p>{backendMessage}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">tRPC Connection Status</h2>
        <div className={`p-4 rounded-md ${
          trpcStatus === 'checking' ? 'bg-yellow-100' : 
          trpcStatus === 'success' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <div className="flex items-center">
            <div className={`w-4 h-4 rounded-full mr-2 ${
              trpcStatus === 'checking' ? 'bg-yellow-500' : 
              trpcStatus === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <p>{trpcMessage}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Troubleshooting Steps</h2>
        <ul className="list-disc pl-6">
          <li className="mb-2">Ensure backend server is running on port 3002</li>
          <li className="mb-2">Check for CORS configuration issues</li>
          <li className="mb-2">Verify tRPC URL is correctly pointing to http://localhost:3002/api/trpc</li>
          <li className="mb-2">Inspect browser console for JavaScript errors</li>
          <li className="mb-2">Clear browser cache or try in incognito mode</li>
        </ul>
      </div>
    </div>
  );
};

export default Diagnostic;

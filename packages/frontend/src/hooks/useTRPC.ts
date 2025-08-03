// packages/frontend/src/hooks/useTRPC.ts
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import type { AppRouter } from '../../../backend/src/routes/trpc';

// Create the QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        if (error?.data?.code === 'UNAUTHORIZED') {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Create the TRPC React client
export const trpc = createTRPCReact<AppRouter>();

// Create the TRPC client for the Provider
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3002/api/trpc',
      // Set maxURLLength to 0 to force POST for all requests
      maxURLLength: 0,
      fetch: async (url, options) => {
        // Add CORS headers to ensure the request is allowed
        // Add logging to debug request payloads
        console.log('🚀 Sending tRPC request to:', url);
        
        if (options?.body) {
          try {
            const bodyContent = options.body as string;
            console.log('📦 Raw request payload:', bodyContent);
            const parsedBody = JSON.parse(bodyContent);
            console.log('📦 Parsed request payload:', parsedBody);
          } catch (e) {
            console.error('Could not parse request body:', e);
            console.log('📦 Unparsed request payload:', options.body);
          }
        } else {
          console.warn('⚠️ No request body found!');
        }
        
        return fetch(url, {
          ...options,
          credentials: 'include',
          headers: {
            ...options?.headers,
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      },
    }),
  ],
});
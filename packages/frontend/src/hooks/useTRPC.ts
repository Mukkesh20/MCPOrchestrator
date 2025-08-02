// packages/frontend/src/hooks/useTRPC.ts
import { QueryClient } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc as importedTrpc } from '../utils/trpc';

export const queryClient = new QueryClient();

export const trpcClient = importedTrpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/trpc',
    }),
  ],
});

// Re-export trpc for backwards compatibility
export { importedTrpc as trpc };
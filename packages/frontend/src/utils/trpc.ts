// packages/frontend/src/utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';

// Define AppRouter type locally to avoid importing directly from backend
// This should match the structure in backend/src/routes/trpc.ts
interface AppRouter {
  servers: any;
  middlewares: any;
  chat: any;
  namespaces: any;
}

export const trpc = createTRPCReact<AppRouter>();
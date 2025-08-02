// packages/frontend/src/utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../backend/src/routes/trpc';

export const trpc = createTRPCReact<AppRouter>();
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import { TimerProvider } from './TimerContext';
import { StopTimerConfirm } from '../components/StopTimerConfirm';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TimerProvider>
          {children}
          <StopTimerConfirm />
        </TimerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
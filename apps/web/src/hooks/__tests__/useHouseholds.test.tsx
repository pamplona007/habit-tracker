import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateHousehold, useUpdateMemberRole, useRemoveMember } from '../useHouseholds';

const createQueryClient = () => new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
);

describe('useUpdateHousehold', () => {
  it('is a mutation hook', () => {
    const { result } = renderHook(() => useUpdateHousehold('hh-1'), { wrapper });
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useUpdateMemberRole', () => {
  it('is a mutation hook', () => {
    const { result } = renderHook(() => useUpdateMemberRole('hh-1'), { wrapper });
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useRemoveMember', () => {
  it('is a mutation hook', () => {
    const { result } = renderHook(() => useRemoveMember('hh-1'), { wrapper });
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
  });
});
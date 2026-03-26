import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/stats';

export const STATS_KEYS = {
  all: ['stats'] as const,
};

export function useStats() {
  return useQuery({
    queryKey: STATS_KEYS.all,
    queryFn: () => statsApi.get(),
  });
}

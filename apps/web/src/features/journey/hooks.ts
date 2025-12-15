import { useQuery } from '@tanstack/react-query';
import { fetchUserJourney } from './api';

export function useUserJourney(userId: string) {
  return useQuery({
    queryKey: ['userJourney', userId],
    queryFn: () => fetchUserJourney(userId),
    enabled: !!userId,
  });
}

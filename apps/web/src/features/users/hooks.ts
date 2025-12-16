import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from './api';
import type { FetchUsersParams } from './api';

export function useUsers(params?: FetchUsersParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => fetchUsers(params),
  });
}

import { authClient } from './authClient';

export async function fetchUsers() {
  return authClient.$fetch('/users', {
    method: 'GET',
  });
}

export async function fetchUserJourney(userId: string, options?: {
  from?: string;
  to?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.from) params.append('from', options.from);
  if (options?.to) params.append('to', options.to);
  if (options?.limit) params.append('limit', options.limit.toString());

  const queryString = params.toString() ? `?${params}` : '';
  return authClient.$fetch(`/users/${userId}/journey${queryString}`, {
    method: 'GET',
  });
}

export async function fetchStats() {
  return authClient.$fetch('/stats', {
    method: 'GET',
  });
}

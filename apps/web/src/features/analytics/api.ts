import { apiStatsSchema } from './schemas';
import { analyticsTransformer } from './transformers';
import type { AppStats } from './schemas';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchStats(): Promise<AppStats> {
  const response = await fetch(`${API_BASE}/stats`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }

  const apiData = await response.json();
  const validated = apiStatsSchema.parse(apiData);

  return analyticsTransformer.fromAPI(validated);
}

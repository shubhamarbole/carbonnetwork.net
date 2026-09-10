import { useAuthStore } from '../store/authStore';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(path, {
      ...options,
      headers
    });

    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error('Session expired');
    }

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || 'API Request failed');
    }

    return json;
  } catch (err: any) {
    console.error(`API Error on path ${path}:`, err.message);
    throw err;
  }
}

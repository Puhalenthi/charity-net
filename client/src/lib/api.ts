import { createApiClient, type ApiClient } from '@charity-net/shared';
import { auth } from './firebase';

let api: ApiClient | null = null;

export function getApi(): ApiClient {
  if (api) return api;
  api = createApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    async getAuthToken() {
      if (!auth.currentUser) return null;
      return auth.currentUser.getIdToken();
    },
  });
  return api;
}

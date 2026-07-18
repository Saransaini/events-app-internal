import { auth } from './firebase';
import type { Dog, Intent, LatLng, Match, SwipeResult, UserProfile } from '../types/models';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8082';

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
    ...(options.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request to ${path} failed with ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

interface ProfileUpdate {
  displayName?: string;
  email?: string;
  dog?: Partial<Dog>;
  intents?: Intent[];
  location?: LatLng;
}

export const api = {
  upsertMe: (body: ProfileUpdate) => request<UserProfile>('/users/me', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request<UserProfile>('/users/me'),
  updateMyProfile: (body: ProfileUpdate) =>
    request<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),

  discoverPeople: (params: { lat: number; lng: number; radiusKm?: number; limit?: number }) => {
    const query = new URLSearchParams({
      lat: String(params.lat),
      lng: String(params.lng),
      ...(params.radiusKm ? { radiusKm: String(params.radiusKm) } : {}),
      ...(params.limit ? { limit: String(params.limit) } : {}),
    });
    return request<{ users: UserProfile[] }>(`/users/discover?${query.toString()}`);
  },

  swipe: (body: { targetUid: string; direction: 'like' | 'pass' }) =>
    request<SwipeResult>('/swipes', { method: 'POST', body: JSON.stringify(body) }),

  getMyMatches: () => request<{ matches: Match[] }>('/matches/mine'),
  getMatch: (id: string) => request<Match>(`/matches/${id}`),
  unmatch: (id: string) => request<void>(`/matches/${id}`, { method: 'DELETE' }),
  getUser: (id: string) => request<UserProfile>(`/users/${id}`),
};

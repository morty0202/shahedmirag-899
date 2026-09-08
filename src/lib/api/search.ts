/**
 * Search API client.
 */

import { getAuthToken } from "./session";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  desc: string;
  link: string;
  createdAt: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    let error = "server_error";
    try {
      const body = await res.json();
      if (body.error) error = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(error);
  }
  return res.json();
}

export async function searchContent(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query.trim() });
  const data = await request<{ results: SearchResult[] }>(`/api/search?${params.toString()}`);
  return data.results;
}

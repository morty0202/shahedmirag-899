/**
 * Chat history API client.
 */

import { getAuthToken } from "./session";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  source?: string;
  model?: string;
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

export async function listConversations(): Promise<ChatConversation[]> {
  return request<ChatConversation[]>("/api/chat/conversations");
}

export async function createConversation(title?: string): Promise<{ ok: true; data: ChatConversation }> {
  return request<{ ok: true; data: ChatConversation }>("/api/chat/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function getConversation(id: string): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
  return request<{ conversation: ChatConversation; messages: ChatMessage[] }>(`/api/chat/conversations/${id}`);
}

export async function updateConversation(id: string, title: string): Promise<{ ok: true; data: ChatConversation }> {
  return request<{ ok: true; data: ChatConversation }>(`/api/chat/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await request(`/api/chat/conversations/${id}`, { method: "DELETE" });
}

export async function appendMessage(conversationId: string, message: { role: "user" | "assistant"; content: string; source?: string; model?: string }): Promise<{ ok: true; data: ChatMessage }> {
  return request<{ ok: true; data: ChatMessage }>(`/api/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(message),
  });
}

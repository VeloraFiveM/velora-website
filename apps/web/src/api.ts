import {
  serverStatusSchema,
  announcementsSchema,
  sessionSchema,
} from "@velora/shared";
import { z } from "zod";
import { config } from "./config";
import type {
  TicketData,
  TicketCategoryData,
  PlatformRole,
  CharacterData,
} from "@velora/shared";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  csrfToken?: string,
): Promise<T> {
  if (!config.apiUrl)
    throw new ApiError(503, "The community service is not configured.");
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    credentials: "include",
    signal: AbortSignal.timeout(20000),
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      error?.error?.message ??
        "The request could not be completed. Please try again.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
async function get(path: string): Promise<unknown> {
  if (!config.apiUrl)
    throw new Error("The community service has not been configured yet.");
  return request(path);
}
export const api = {
  status: async () => serverStatusSchema.parse(await get("/v1/public/server")),
  announcements: async () =>
    announcementsSchema.parse(await get("/v1/public/announcements")),
  capabilities: async () =>
    z
      .object({ discordLogin: z.boolean() })
      .parse(await get("/v1/public/capabilities")),
  session: async () => sessionSchema.parse(await get("/v1/me")),
  categories: () =>
    request<Pick<TicketCategoryData, "id" | "name" | "description">[]>(
      "/v1/ticket-categories",
    ),
  tickets: (staff = false, claimed = false) =>
    request<TicketData[]>(
      staff
        ? `/v1/staff/tickets${claimed ? "?claimed=me" : ""}`
        : "/v1/tickets",
    ),
  ticket: (id: string) =>
    request<TicketData & { hasOlder: boolean }>(
      `/v1/tickets/${encodeURIComponent(id)}`,
    ),
  notifications: () =>
    request<
      {
        id: string;
        title: string;
        body: string;
        href: string | null;
        createdAt: string;
      }[]
    >("/v1/me/notifications"),
  clearNotifications: (csrf: string, id?: string) =>
    request(
      "/v1/me/notifications/clear",
      "POST",
      { ...(id ? { id } : {}) },
      csrf,
    ),
  characters: () =>
    request<{
      configured: boolean;
      lastSyncAt: string | null;
      characters: CharacterData[];
    }>("/v1/me/characters"),
  transcripts: () => request<TicketData[]>("/v1/staff/transcripts"),
  transcript: (id: string) =>
    request<TicketData & { hasOlder: boolean }>(
      `/v1/staff/transcripts/${encodeURIComponent(id)}`,
    ),
  roles: () =>
    request<(PlatformRole & { permissions: { permissionKey: string }[] })[]>(
      "/v1/admin/roles",
    ),
  adminCategories: () =>
    request<TicketCategoryData[]>("/v1/admin/ticket-categories"),
  discord: () =>
    request<{
      configured: boolean;
      guildId: string | null;
      botName?: string;
      categories: { id: string; name: string }[];
      roles: { id: string; name: string }[];
    }>("/v1/admin/discord"),
  discordRoles: () =>
    request<{ configured: boolean; roles: { id: string; name: string }[] }>(
      "/v1/admin/discord/roles",
    ),
  sync: () =>
    request<{
      configured: boolean;
      pending: number;
      failed: {
        id: string;
        kind: string;
        ticketId: string;
        attempts: number;
        lastError: string | null;
      }[];
    }>("/v1/admin/ticket-sync"),
  logout: async (csrfToken: string) => {
    if (!config.apiUrl) throw new Error("API unavailable");
    const response = await fetch(`${config.apiUrl}/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": csrfToken },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error("Logout failed. Please retry.");
  },
};

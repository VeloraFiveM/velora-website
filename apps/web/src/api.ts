import {
  serverStatusSchema,
  announcementsSchema,
  sessionSchema,
} from "@velora/shared";
import { z } from "zod";
import { config } from "./config";
async function get(path: string): Promise<unknown> {
  if (!config.apiUrl)
    throw new Error("The community service has not been configured yet.");
  const response = await fetch(`${config.apiUrl}${path}`, {
    signal: AbortSignal.timeout(7000),
    credentials: "include",
  });
  if (!response.ok)
    throw new Error(
      "The community service is temporarily unavailable. Please try again later.",
    );
  return response.json();
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

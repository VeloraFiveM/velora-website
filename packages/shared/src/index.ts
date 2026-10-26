import { z } from "zod";
export const permissions = [
  "tickets.view",
  "tickets.reply",
  "tickets.claim",
  "tickets.close",
  "tickets.sensitive",
  "notes.view",
  "applications.review",
  "applications.accept",
  "applications.reject",
  "content.manage",
  "audit.view",
  "roles.manage",
  "settings.manage",
] as const;
export type Permission = (typeof permissions)[number];
export type Principal = {
  discordId: string;
  suspended: boolean;
  permissions: readonly Permission[];
};
/** Owner configuration is supplied exclusively by the backend. */
export function can(
  principal: Principal | null,
  permission: Permission,
  ownerDiscordId: string,
): boolean {
  return (
    !!principal &&
    !principal.suspended &&
    ((!!ownerDiscordId && principal.discordId === ownerDiscordId) ||
      principal.permissions.includes(permission))
  );
}
export const serverStatusSchema = z.object({
  state: z.enum(["online", "offline", "unavailable"]),
  name: z.string(),
  players: z.number().int().nonnegative().nullable(),
  capacity: z.number().int().positive().nullable(),
  updatedAt: z.iso.datetime().nullable(),
});
export type ServerStatus = z.infer<typeof serverStatusSchema>;
export const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  category: z.string(),
  publishedAt: z.iso.datetime(),
  pinned: z.boolean(),
});
export const announcementsSchema = z.array(announcementSchema);
export type Announcement = z.infer<typeof announcementSchema>;
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
  }),
});
export const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    discordId: z.string(),
    username: z.string(),
    avatar: z.string().nullable(),
    createdAt: z.iso.datetime(),
  }),
  isOwner: z.boolean(),
  permissions: z.array(z.string()),
  csrfToken: z.string(),
  expiresAt: z.iso.datetime(),
});
export type AuthSession = z.infer<typeof sessionSchema>;

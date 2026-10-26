import { z } from "zod";
export const permissions = [
  "tickets.view",
  "tickets.reply",
  "tickets.claim",
  "tickets.close",
  "tickets.manage",
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
  roles: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
  expiresAt: z.iso.datetime(),
});
export type AuthSession = z.infer<typeof sessionSchema>;

export const ticketStatuses = [
  "OPEN",
  "AWAITING_STAFF",
  "AWAITING_PLAYER",
  "IN_PROGRESS",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;
export const ticketPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const ticketCreateSchema = z
  .object({
    categoryId: z.string().min(1).max(100),
    subject: z.string().trim().min(5).max(160),
    body: z.string().trim().min(10).max(12000),
    clientKey: z.uuid(),
  })
  .strict();
export const ticketReplySchema = z
  .object({
    body: z.string().trim().min(1).max(12000),
    internal: z.boolean().default(false),
    clientKey: z.uuid(),
    attachments: z.array(z.string().max(100)).max(5).default([]),
  })
  .strict();
export const ticketUpdateSchema = z
  .object({
    status: z.enum(ticketStatuses).optional(),
    priority: z.enum(ticketPriorities).optional(),
    claim: z.boolean().optional(),
    assignedToId: z.string().max(100).nullable().optional(),
    categoryId: z.string().min(1).max(100).optional(),
  })
  .strict();
export const categoryInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().min(5).max(500),
    enabled: z.boolean(),
    sensitive: z.boolean(),
    discordParentId: z
      .string()
      .regex(/^\d{17,20}$/)
      .nullable(),
    roleIds: z.array(z.string().min(1).max(100)).max(30),
  })
  .strict();
export type TicketCategoryData = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sensitive: boolean;
  discordParentId: string | null;
  roles: { roleId: string }[];
};
export type PlatformRole = {
  id: string;
  name: string;
  discordRoleId: string | null;
};
export type TicketMessageData = {
  id: string;
  body: string;
  internal: boolean;
  source: string;
  createdAt: string;
  author: { username: string; discordId: string };
  attachments: { id: string; originalName: string; size: number }[];
};
export type TicketData = {
  id: string;
  number: number;
  subject: string;
  status: (typeof ticketStatuses)[number];
  priority: (typeof ticketPriorities)[number];
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string };
  owner: { id: string; username: string };
  assignedTo: { id: string; username: string } | null;
  messages?: TicketMessageData[];
  discord?: { channelId: string } | null;
  canStaff?: boolean;
};
export const characterInputSchema = z
  .object({
    serverId: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/),
    observedAt: z.iso.datetime(),
    characters: z
      .array(
        z
          .object({
            citizenId: z.string().min(1).max(50),
            discordId: z.string().regex(/^\d{17,20}$/),
            name: z.string().min(1).max(100),
            job: z.string().max(100),
            cash: z.number().finite().min(-1e12).max(1e12),
            bank: z.number().finite().min(-1e12).max(1e12),
            playtimeSeconds: z.number().int().nonnegative().max(2147483647),
            trackedSince: z.iso.datetime(),
            online: z.boolean(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export type CharacterData = {
  id: string;
  citizenId: string;
  name: string;
  job: string;
  cash: number;
  bank: number;
  playtimeSeconds: number;
  trackedSince: string;
  online: boolean;
  observedAt: string;
  syncedAt: string;
};
export type StaffIdentity = {
  userId: string;
  discordId: string;
  suspended: boolean;
  permissions: Permission[];
  roleIds: string[];
};
export function canAccessCategory(
  actor: StaffIdentity,
  category: { roles: { roleId: string }[]; sensitive: boolean },
  ownerId: string,
  permission: Permission = "tickets.view",
) {
  if (!can(actor, permission, ownerId)) return false;
  if (actor.discordId === ownerId) return true;
  return (
    (!category.sensitive || can(actor, "tickets.sensitive", ownerId)) &&
    category.roles.some((item) => actor.roleIds.includes(item.roleId))
  );
}
export function ticketLabel(number: number) {
  return `VEL-${String(number).padStart(6, "0")}`;
}

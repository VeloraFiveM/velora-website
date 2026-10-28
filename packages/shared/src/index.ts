import { z } from "zod";
export const permissions = [
  "tickets.view",
  "tickets.reply",
  "tickets.claim",
  "tickets.close",
  "tickets.manage",
  "tickets.delete",
  "transcripts.view",
  "tickets.sensitive",
  "notes.view",
  "applications.review",
  "applications.manage",
  "applications.openclose",
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
    discordUsername: z.string().nullable().optional(),
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
  _count?: { tickets: number };
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
  deletedAt?: string | null;
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
  return `Ticket ${String(number).padStart(4, "0")}`;
}

export const applicationQuestionSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/),
    label: z.string().min(1).max(300),
    type: z.enum([
      "short",
      "long",
      "number",
      "choice",
      "checkboxes",
      "select",
      "date",
      "file",
      "yesno",
      "info",
    ]),
    required: z.boolean().default(false),
    placeholder: z.string().max(200).default(""),
    help: z.string().max(1000).default(""),
    options: z.array(z.string().min(1).max(200)).max(30).default([]),
    maxLength: z.number().int().min(1).max(12000).default(3000),
    min: z.number().finite().nullable().default(null),
    max: z.number().finite().nullable().default(null),
    visibleIf: z
      .object({ questionId: z.string(), value: z.string().max(200) })
      .nullable()
      .default(null),
  })
  .strict();
export const discordApplicationWebhookSchema = z
  .string()
  .trim()
  .max(500)
  .regex(
    /^https:\/\/discord\.com\/api\/(?:v[0-9]+\/)?webhooks\/[0-9]{17,20}\/[A-Za-z0-9_-]{40,200}$/,
    "Enter a Discord webhook URL from discord.com.",
  );
export const applicationFormSchema = z
  .object({
    title: z.string().trim().min(2).max(100),
    description: z.string().min(5).max(2000),
    category: z.string().min(1).max(80),
    published: z.boolean(),
    open: z.boolean(),
    reviewRoleIds: z.array(z.string()).max(30),
    requiredRoleIds: z.array(z.string()).max(30),
    minAccountDays: z.number().int().min(0).max(3650),
    cooldownHours: z.number().int().min(0).max(8760),
    maxActive: z.number().int().min(1).max(10),
    opensAt: z.iso.datetime().nullable(),
    closesAt: z.iso.datetime().nullable(),
    confirmation: z.string().min(1).max(1000),
    acceptedMessage: z
      .string()
      .trim()
      .min(1)
      .max(3000)
      .default("Your application has been accepted. Welcome to the team!"),
    deniedMessage: z
      .string()
      .trim()
      .min(1)
      .max(3000)
      .default(
        "Thank you for applying. Your application has not been accepted this time.",
      ),
    notifyStaff: z.boolean().default(true),
    notificationWebhookUrl: discordApplicationWebhookSchema
      .nullable()
      .optional(),
    notificationChannelId: z
      .string()
      .regex(/^\d{17,20}$/)
      .nullable()
      .default(null),
    questions: z.array(applicationQuestionSchema).min(1).max(50),
  })
  .strict()
  .superRefine((form, ctx) => {
    const seen = new Set<string>();
    for (const [i, q] of form.questions.entries()) {
      if (seen.has(q.id))
        ctx.addIssue({
          code: "custom",
          message: "Question IDs must be unique",
          path: ["questions", i, "id"],
        });
      if (q.visibleIf && !seen.has(q.visibleIf.questionId))
        ctx.addIssue({
          code: "custom",
          message: "Conditions must refer to an earlier question",
          path: ["questions", i, "visibleIf"],
        });
      if (
        ["choice", "checkboxes", "select"].includes(q.type) &&
        q.options.length < 2
      )
        ctx.addIssue({
          code: "custom",
          message: "Add at least two choices",
          path: ["questions", i, "options"],
        });
      if (q.min !== null && q.max !== null && q.min > q.max)
        ctx.addIssue({
          code: "custom",
          message: "Minimum must not exceed maximum",
          path: ["questions", i],
        });
      if (new Set(q.options).size !== q.options.length)
        ctx.addIssue({
          code: "custom",
          message: "Choice options must be unique",
          path: ["questions", i, "options"],
        });
      seen.add(q.id);
    }
    if (form.opensAt && form.closesAt && form.opensAt >= form.closesAt)
      ctx.addIssue({
        code: "custom",
        message: "Closing time must follow opening time",
      });
  });
export type ApplicationQuestion = z.infer<typeof applicationQuestionSchema>;
export const applicationStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "MORE_INFO",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export function questionVisible(
  question: ApplicationQuestion,
  answers: Record<string, unknown>,
) {
  return (
    !question.visibleIf ||
    String(answers[question.visibleIf.questionId] ?? "") ===
      question.visibleIf.value
  );
}
export function validateApplicationAnswers(
  questions: ApplicationQuestion[],
  answers: Record<string, unknown>,
  submit: boolean,
) {
  const allowed = new Set(questions.map((q) => q.id));
  if (Object.keys(answers).some((id) => !allowed.has(id)))
    return "Unknown answer field.";
  for (const q of questions) {
    if (q.type === "info" || !questionVisible(q, answers)) continue;
    const v = answers[q.id];
    const empty =
      v === undefined ||
      v === null ||
      v === "" ||
      (Array.isArray(v) && v.length === 0);
    if (empty) {
      if (submit && q.required) return `${q.label} is required.`;
      continue;
    }
    if (q.type === "yesno") {
      if (typeof v !== "boolean") return `${q.label} must be yes or no.`;
    } else if (q.type === "number") {
      if (
        typeof v !== "number" ||
        !Number.isFinite(v) ||
        (q.min !== null && v < q.min) ||
        (q.max !== null && v > q.max)
      )
        return `${q.label} is outside its number limits.`;
    } else if (q.type === "checkboxes" || q.type === "file") {
      if (
        !Array.isArray(v) ||
        v.length > 30 ||
        v.some(
          (item) =>
            typeof item !== "string" ||
            (q.type === "checkboxes" && !q.options.includes(item)),
        )
      )
        return `${q.label} contains an invalid selection.`;
    } else {
      if (typeof v !== "string" || v.length > q.maxLength)
        return `${q.label} exceeds its text limit.`;
      if (["choice", "select"].includes(q.type) && !q.options.includes(v))
        return `${q.label} contains an invalid choice.`;
      if (
        q.type === "date" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
          Number.isNaN(Date.parse(v)) ||
          new Date(v).toISOString().slice(0, 10) !== v)
      )
        return `${q.label} must be a date.`;
    }
  }
  return null;
}

export * from "./rules";

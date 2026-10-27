import type { ApplicationQuestion } from "@velora/shared";
export type FormData = {
  id: string;
  title: string;
  description: string;
  category: string;
  published: boolean;
  open: boolean;
  accepting?: boolean;
  archivedAt: string | null;
  currentVersion: number;
  reviewRoleIds: string[];
  requiredRoleIds: string[];
  minAccountDays: number;
  cooldownHours: number;
  maxActive: number;
  opensAt: string | null;
  closesAt: string | null;
  confirmation: string;
  acceptedMessage: string;
  deniedMessage: string;
  notifyStaff: boolean;
  notificationChannelId: string | null;
  versions: { id: string; version: number; questions: ApplicationQuestion[] }[];
};
export type Submission = {
  id: string;
  number: number;
  userId: string;
  reviewerId: string | null;
  status: string;
  answers: Record<string, unknown>;
  versionId: string;
  updatedAt: string;
  submittedAt: string | null;
  form: FormData;
  version: {
    id: string;
    title: string;
    description: string;
    version: number;
    questions: ApplicationQuestion[];
  };
  canReview: boolean;
  applicant?: { username: string } | null;
  messages: {
    id: string;
    authorName: string;
    body: string;
    internal: boolean;
    createdAt: string;
  }[];
  files: {
    id: string;
    originalName: string;
    questionId: string;
    size: number;
  }[];
};

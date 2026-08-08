export const newsStatuses = [
  "draft",
  "ready",
  "scheduled",
  "published",
] as const;

export type NewsStatus =
  (typeof newsStatuses)[number];

export type News = {
  id: string;
  title: string;
  content: string;
  status: NewsStatus;
  image_url: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateNewsInput = {
  title: string;
  content?: string;
  status?: NewsStatus;
  image_url?: string | null;
  source_url?: string | null;
};

export type UpdateNewsInput = {
  title?: string;
  content?: string;
  status?: NewsStatus;
  image_url?: string | null;
  source_url?: string | null;
};

export const publicationChannels = [
  "website",
  "brevo",
  "google_business",
  "linkedin",
  "facebook",
] as const;

export type PublicationChannel =
  (typeof publicationChannels)[number];

export const publicationStatuses = [
  "draft",
  "ready",
  "scheduled",
  "published",
  "failed",
] as const;

export type PublicationStatus =
  (typeof publicationStatuses)[number];

export type Publication = {
  id: string;
  news_id: string;
  channel: PublicationChannel;
  title: string | null;
  content: string;
  status: PublicationStatus;
  scheduled_at: string | null;
  published_at: string | null;
  published_url: string | null;
  created_at: string;
  updated_at: string;
};
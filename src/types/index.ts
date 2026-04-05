import { Request } from 'express';

// ── Database Row Types ──────────────────────────────────────────────
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  preferred_language: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
}

export interface SourceRow {
  id: string;
  name: string;
  slug: string;
  url: string;
  feed_url: string | null;
  language: string;
  country_id: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface CountryRow {
  id: string;
  code: string;
  name: string;
  flag_emoji: string | null;
  is_active: boolean;
}

export interface CountryTranslationRow {
  id: string;
  country_id: string;
  language: string;
  name: string;
}

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryTranslationRow {
  id: string;
  category_id: string;
  language: string;
  name: string;
}

export interface ArticleRow {
  id: string;
  source_id: string;
  category_id: string | null;
  original_url: string;
  content_hash: string;
  title: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  author: string | null;
  published_at: Date;
  language: string;
  is_active: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface ArticleTranslationRow {
  id: string;
  article_id: string;
  language: string;
  title: string;
  summary: string | null;
  content: string | null;
}

export interface TagRow {
  id: string;
  slug: string;
  name: string;
}

export interface ArticleReactionRow {
  id: string;
  article_id: string;
  user_id: string;
  reaction_type: string;
  created_at: Date;
}

export interface ArticleCommentRow {
  id: string;
  article_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SavedArticleRow {
  id: string;
  user_id: string;
  article_id: string;
  created_at: Date;
}

// ── API Types ───────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ── Ingestion Types ─────────────────────────────────────────────────
export interface IngestArticlePayload {
  source_slug: string;
  original_url: string;
  title: string;
  summary?: string;
  content?: string;
  image_url?: string;
  author?: string;
  published_at: string;
  language: string;
  category_slug?: string;
  tags?: string[];
  translations?: {
    language: string;
    title: string;
    summary?: string;
    content?: string;
  }[];
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: IngestArticlePayload | IngestArticlePayload[];
}

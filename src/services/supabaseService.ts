import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Article } from '../types';
import { INITIAL_ARTICLES } from '../data/initialArticles';

const CREDENTIALS_KEY = 'tintuc_supabase_credentials';
const LOCAL_ARTICLES_KEY = 'tintuc_articles_v3';

export interface SupabaseCredentials {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function createVietnameseSlug(title: string, fallbackId?: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 160);
  const suffix = (fallbackId || `${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '').slice(-6);
  return base ? `${base}-${suffix}` : `bai-viet-${suffix}`;
}

/**
 * Normalizes a row returned from Supabase `public.articles` into an `Article` object,
 * recovering `status` and `isFeatured` from `author` JSONB if the table uses an older schema.
 */
function normalizeSupabaseArticleRow(row: Record<string, any>): Article {
  const rawAuthor = typeof row.author === 'object' && row.author !== null ? row.author : {};
  const recoveredStatus =
    row.status === 'draft' || rawAuthor._status === 'draft' ? 'draft' : 'published';
  const recoveredFeatured = Boolean(row.isFeatured ?? rawAuthor._isFeatured ?? false);

  return {
    id: String(row.id),
    slug: String(row.slug || createVietnameseSlug(String(row.title || 'bai-viet'), String(row.id))),
    title: String(row.title || 'Untitled'),
    summary: String(row.summary || ''),
    content: String(row.content || ''),
    category: String(row.category || 'Technology'),
    coverUrl: String(
      row.coverUrl ||
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
    ),
    author: {
      name: String(rawAuthor.name || 'Contributor'),
      avatar: rawAuthor.avatar ? String(rawAuthor.avatar) : undefined,
      role: String(rawAuthor.role || 'Contributor'),
    },
    publishedAt: String(row.publishedAt || new Date().toISOString()),
    readTimeMinutes: Number(row.readTimeMinutes) || 3,
    views: Number(row.views) || 0,
    likes: Number(row.likes) || 0,
    isFeatured: recoveredFeatured,
    status: recoveredStatus,
    tags: Array.isArray(row.tags) ? row.tags : ['TinTuc'],
    commentsCount: Number(row.commentsCount) || 0,
    comments: Array.isArray(row.comments) ? row.comments : [],
  };
}

/**
 * Prepares an Article payload for Supabase `public.articles`, embedding `_status` and `_isFeatured`
 * inside `author` JSONB so they are preserved even if the user's Supabase table lacks those columns.
 */
function prepareSupabaseArticlePayload(article: Article): Record<string, any> {
  const slug =
    (article.slug || '').trim() || createVietnameseSlug(article.title || 'bai-viet', article.id);
  const status = article.status === 'draft' ? 'draft' : 'published';
  const isFeatured = Boolean(article.isFeatured ?? false);

  return {
    id: article.id,
    slug,
    title: article.title,
    summary: article.summary,
    content: article.content,
    category: article.category,
    coverUrl: article.coverUrl,
    author: {
      name: article.author?.name || 'Contributor',
      avatar: article.author?.avatar,
      role: article.author?.role || 'Contributor',
      _status: status,
      _isFeatured: isFeatured,
    },
    publishedAt: article.publishedAt || new Date().toISOString(),
    readTimeMinutes: Math.max(1, Math.round(Number(article.readTimeMinutes) || 3)),
    views: Math.max(0, Math.round(Number(article.views) || 1)),
    likes: Math.max(0, Math.round(Number(article.likes) || 0)),
    isFeatured,
    status,
    tags: Array.isArray(article.tags) && article.tags.length > 0 ? article.tags : ['TinTuc'],
    commentsCount: Math.max(0, Math.round(Number(article.commentsCount) || 0)),
    comments: Array.isArray(article.comments) ? article.comments : [],
  };
}

export function mergeArticlesList(...lists: (Article[] | null | undefined)[]): Article[] {
  const map = new Map<string, Article>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !item.id || item.id.startsWith('__sys_')) continue;
      map.set(item.id, {
        ...item,
        status: item.status === 'draft' ? 'draft' : 'published',
      });
    }
  }
  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return merged;
}

/**
 * Gets saved Supabase credentials from Env or LocalStorage
 */
export function getSavedSupabaseCredentials(): SupabaseCredentials {
  const env = (import.meta as any).env || {};
  const envUrl = env.VITE_SUPABASE_URL || '';
  const envKey = env.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return { supabaseUrl: envUrl, supabaseAnonKey: envKey };
  }

  const saved = localStorage.getItem(CREDENTIALS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return parsed;
      }
    } catch {}
  }

  return { supabaseUrl: '', supabaseAnonKey: '' };
}

/**
 * Saves custom Supabase credentials
 */
export function saveSupabaseCredentials(creds: SupabaseCredentials): void {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

/**
 * Initializes and caches Supabase Client
 */
export function getSupabaseClient(): SupabaseClient | null {
  const creds = getSavedSupabaseCredentials();
  if (!creds.supabaseUrl || !creds.supabaseAnonKey) {
    return null;
  }

  if (cachedClient && lastUrl === creds.supabaseUrl && lastKey === creds.supabaseAnonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(creds.supabaseUrl, creds.supabaseAnonKey);
    lastUrl = creds.supabaseUrl;
    lastKey = creds.supabaseAnonKey;
    return cachedClient;
  } catch (e) {
    console.warn('Failed to initialize Supabase client:', e);
    return null;
  }
}

/**
 * Tests connection to Supabase database table
 */
export async function testSupabaseConnection(customCreds?: SupabaseCredentials): Promise<{
  success: boolean;
  message: string;
  count?: number;
}> {
  let client: SupabaseClient | null = null;

  if (customCreds) {
    try {
      client = createClient(customCreds.supabaseUrl, customCreds.supabaseAnonKey);
    } catch (e: any) {
      return { success: false, message: `URL hoặc Key không hợp lệ: ${e.message}` };
    }
  } else {
    client = getSupabaseClient();
  }

  if (!client) {
    return { success: false, message: 'Chưa cấu hình Supabase URL và Anon Key.' };
  }

  try {
    const { error, count } = await client
      .from('articles')
      .select('id', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "articles" does not exist')) {
        return {
          success: false,
          message:
            'Kết nối Supabase thành công nhưng chưa tạo bảng "articles". Vui lòng chạy câu lệnh SQL khởi tạo bảng!',
        };
      }
      return { success: false, message: `Lỗi Supabase (${error.code}): ${error.message}` };
    }

    return {
      success: true,
      message: `Kết nối thành công tới CSDL Supabase! Hiện có ${count || 0} bài viết trong bảng "articles".`,
      count: count || 0,
    };
  } catch (err: any) {
    return { success: false, message: `Lỗi kết nối mạng hoặc CORS: ${err.message}` };
  }
}

/**
 * Fetches articles from Supabase `public.articles` and syncs any pending local articles up to Supabase
 */
export async function fetchArticlesFromSupabase(): Promise<Article[] | null> {
  const client = getSupabaseClient();
  let localArticles: Article[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_ARTICLES_KEY);
    if (raw) localArticles = JSON.parse(raw);
  } catch {}

  if (!client) {
    return localArticles.length > 0 ? localArticles : INITIAL_ARTICLES;
  }

  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .order('publishedAt', { ascending: false });

    if (error || !data) {
      return localArticles.length > 0 ? localArticles : null;
    }

    const remoteArticles = (data as Record<string, any>[])
      .filter((row) => row && row.id && !String(row.id).startsWith('__sys_'))
      .map(normalizeSupabaseArticleRow);

    // If there are locally published user articles (art-user-...) that failed to upload earlier, push them to Supabase now
    const remoteIds = new Set(remoteArticles.map((a) => a.id));
    const unsyncedLocalUserArticles = localArticles.filter(
      (a) => a.id && a.id.startsWith('art-user-') && !remoteIds.has(a.id)
    );

    for (const unsynced of unsyncedLocalUserArticles) {
      await insertArticleToSupabase(unsynced);
    }

    const merged =
      remoteArticles.length > 0 || unsyncedLocalUserArticles.length > 0
        ? mergeArticlesList(unsyncedLocalUserArticles, remoteArticles)
        : INITIAL_ARTICLES;

    try {
      localStorage.setItem(LOCAL_ARTICLES_KEY, JSON.stringify(merged));
    } catch {}

    return merged;
  } catch {
    return localArticles.length > 0 ? localArticles : null;
  }
}

/**
 * Real-time subscription to Supabase `public.articles` changes (with periodic sync fallback)
 */
export function subscribeToFirestoreArticles(
  onUpdate: (articles: Article[]) => void
): () => void {
  const client = getSupabaseClient();
  let isActive = true;

  const refreshFromSupabase = async () => {
    if (!isActive) return;
    const latest = await fetchArticlesFromSupabase();
    if (isActive && latest && latest.length > 0) {
      onUpdate(latest);
    }
  };

  let channel: any = null;
  if (client) {
    try {
      channel = client
        .channel('public:articles:realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'articles' },
          () => {
            refreshFromSupabase();
          }
        )
        .subscribe();
    } catch {}
  }

  // Also refresh on window focus so switching between Contributor tab, Admin tab, and Web tab updates immediately
  const handleFocus = () => {
    refreshFromSupabase();
  };
  window.addEventListener('focus', handleFocus);

  return () => {
    isActive = false;
    window.removeEventListener('focus', handleFocus);
    if (client && channel) {
      try {
        client.removeChannel(channel);
      } catch {}
    }
  };
}

/**
 * Inserts/upserts a new article into Supabase `public.articles`, automatically stripping
 * any columns missing from older table schemas and resolving duplicate slugs.
 */
export async function insertArticleToSupabase(article: Article): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const payload = prepareSupabaseArticlePayload(article);

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const { error } = await client.from('articles').upsert([payload], { onConflict: 'id' });
      if (!error) {
        return true;
      }

      const msg = error.message || '';
      // Automatically strip any column that does not exist in the user's Supabase `articles` table
      const missingColMatch =
        msg.match(/Could not find the '([^']+)' column/i) ||
        msg.match(/column "([^"]+)" of relation "articles" does not exist/i);

      if (missingColMatch && missingColMatch[1] && missingColMatch[1] in payload) {
        delete payload[missingColMatch[1]];
        continue;
      }

      // Automatically resolve duplicate `slug` constraint
      if (error.code === '23505' && payload.slug) {
        payload.slug = `${payload.slug}-${Math.floor(1000 + Math.random() * 9000)}`;
        continue;
      }

      console.warn('Supabase insert article error:', error);
      return false;
    } catch (err) {
      console.warn('Supabase insert exception:', err);
      return false;
    }
  }

  return false;
}

/**
 * Updates an article in Supabase `public.articles` with automatic fallback for older table schemas
 */
export async function updateArticleInSupabase(
  id: string,
  updates: Partial<Article>
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const payload: Record<string, any> = { ...updates };
  delete payload.isBookmarked;

  // If updating status or isFeatured, also sync inside `author` JSONB in case top-level columns don't exist
  if (updates.status !== undefined || updates.isFeatured !== undefined || updates.author !== undefined) {
    try {
      const { data: existingRow } = await client
        .from('articles')
        .select('author, status, isFeatured')
        .eq('id', id)
        .maybeSingle();

      if (existingRow) {
        const currentAuthor =
          typeof existingRow.author === 'object' && existingRow.author !== null
            ? existingRow.author
            : {};
        payload.author = {
          ...currentAuthor,
          ...(updates.author || {}),
          _status:
            updates.status !== undefined
              ? updates.status
              : existingRow.status || currentAuthor._status || 'published',
          _isFeatured:
            updates.isFeatured !== undefined
              ? updates.isFeatured
              : Boolean(existingRow.isFeatured ?? currentAuthor._isFeatured ?? false),
        };
      }
    } catch {}
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const { error } = await client.from('articles').update(payload).eq('id', id);
      if (!error) return true;

      const msg = error.message || '';
      const missingColMatch =
        msg.match(/Could not find the '([^']+)' column/i) ||
        msg.match(/column "([^"]+)" of relation "articles" does not exist/i);

      if (missingColMatch && missingColMatch[1] && missingColMatch[1] in payload) {
        delete payload[missingColMatch[1]];
        if (Object.keys(payload).length === 0) return true;
        continue;
      }

      return false;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Deletes an article from Supabase `public.articles`
 */
export async function deleteArticleFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('articles').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Seeds initial articles dataset to Supabase if database is empty
 */
export async function seedArticlesToSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    for (const art of INITIAL_ARTICLES) {
      await insertArticleToSupabase(art);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the safe, non-destructive SQL script for Supabase SQL Editor
 */
export function getSupabaseSQLMigrationScript(): string {
  return `-- ======================================================
-- BẢNG DỮ LIỆU CSDL TIN TỨC SUPABASE (TinTucFast)
-- Sao chép toàn bộ đoạn này dán vào: Supabase Dashboard -> SQL Editor -> Run
-- (An toàn 100%: Không xóa dữ liệu bài viết cũ đang có)
-- ======================================================

CREATE TABLE IF NOT EXISTS public.articles (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT UNIQUE NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "coverUrl" TEXT NOT NULL,
  "author" JSONB NOT NULL,
  "publishedAt" TIMESTAMPTZ DEFAULT NOW(),
  "readTimeMinutes" INT DEFAULT 3,
  "views" INT DEFAULT 0,
  "likes" INT DEFAULT 0,
  "isFeatured" BOOLEAN DEFAULT FALSE,
  "status" TEXT DEFAULT 'published',
  "tags" TEXT[] DEFAULT '{}',
  "commentsCount" INT DEFAULT 0,
  "comments" JSONB DEFAULT '[]'::jsonb
);

-- Tự động bổ sung các cột mới nếu bảng articles được tạo từ phiên bản cũ
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'published';

CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles("publishedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles("category");

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép đọc bài viết công khai" ON public.articles;
CREATE POLICY "Cho phép đọc bài viết công khai" 
  ON public.articles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Cho phép thêm và sửa bài viết" ON public.articles;
CREATE POLICY "Cho phép thêm và sửa bài viết" 
  ON public.articles FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- ======================================================
-- BẢNG QUẢN LÝ NHÂN SỰ & PHÂN QUYỀN GMAIL (managed_users)
-- ======================================================
CREATE TABLE IF NOT EXISTS public.managed_users (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "avatar" TEXT DEFAULT '',
  "role" TEXT DEFAULT 'contributor',
  "status" TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "permissions" JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_managed_users_email ON public.managed_users("email");

ALTER TABLE public.managed_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép truy cập bảng managed_users cho người dùng đã xác thực" ON public.managed_users;
CREATE POLICY "Cho phép truy cập bảng managed_users cho người dùng đã xác thực"
  ON public.managed_users FOR ALL
  USING (true)
  WITH CHECK (true);
`;
}

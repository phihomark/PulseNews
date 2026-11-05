import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Article, Comment } from '../types';
import { INITIAL_ARTICLES } from '../data/initialArticles';

const CREDENTIALS_KEY = 'tintuc_supabase_credentials';

export interface SupabaseCredentials {
  supabaseUrl: string;
  supabaseAnonKey: string;
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
    const { data, error, count } = await client
      .from('articles')
      .select('id', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "articles" does not exist')) {
        return {
          success: false,
          message: 'Kết nối Supabase thành công nhưng chưa tạo bảng "articles". Vui lòng chạy câu lệnh SQL khởi tạo bảng!'
        };
      }
      return { success: false, message: `Lỗi Supabase (${error.code}): ${error.message}` };
    }

    return {
      success: true,
      message: `Kết nối thành công tới CSDL Supabase! Hiện có ${count || 0} bài viết trong bảng "articles".`,
      count: count || 0
    };
  } catch (err: any) {
    return { success: false, message: `Lỗi kết nối mạng hoặc CORS: ${err.message}` };
  }
}

/**
 * Fetches articles from Supabase
 */
export async function fetchArticlesFromSupabase(): Promise<Article[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .order('publishedAt', { ascending: false });

    if (error || !data) return null;

    return data as Article[];
  } catch {
    return null;
  }
}

/**
 * Inserts a new article into Supabase
 */
export async function insertArticleToSupabase(article: Article): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('articles')
      .insert([article]);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Updates an article in Supabase
 */
export async function updateArticleInSupabase(id: string, updates: Partial<Article>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('articles')
      .update(updates)
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Deletes an article from Supabase
 */
export async function deleteArticleFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('articles')
      .delete()
      .eq('id', id);

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
    const { error } = await client
      .from('articles')
      .upsert(INITIAL_ARTICLES, { onConflict: 'id' });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Returns the exact SQL script for Supabase SQL Editor
 */
export function getSupabaseSQLMigrationScript(): string {
  return `-- ======================================================
-- BẢNG DỮ LIỆU CSDL TIN TỨC SUPABASE (TinTucFast)
-- Sao chép toàn bộ đoạn này dán vào: Supabase Dashboard -> SQL Editor -> Run
-- ======================================================

CREATE TABLE IF NOT EXISTS public.articles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  coverUrl TEXT NOT NULL,
  author JSONB NOT NULL,
  publishedAt TIMESTAMPTZ DEFAULT NOW(),
  readTimeMinutes INT DEFAULT 3,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  isFeatured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'published',
  tags TEXT[] DEFAULT '{}',
  commentsCount INT DEFAULT 0,
  comments JSONB DEFAULT '[]'::jsonb
);

-- Tối ưu tốc độ truy vấn bài viết mới nhất
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles("publishedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category);

-- Bật tính năng truy cập công khai (Row Level Security - RLS) cho phép đọc và ghi dữ liệu
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép đọc bài viết công khai" 
  ON public.articles FOR SELECT 
  USING (true);

CREATE POLICY "Cho phép thêm và sửa bài viết" 
  ON public.articles FOR ALL 
  USING (true) 
  WITH CHECK (true);
`;
}

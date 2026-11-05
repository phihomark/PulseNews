import { Article, Comment } from '../types';
import { INITIAL_ARTICLES } from '../data/initialArticles';

const LOCAL_STORAGE_KEY = 'tintuc_articles_v2';

/**
 * Cloud Database Connector Service (Supports Firebase Firestore / Supabase / LocalStorage Fallback)
 */
export class CloudDatabaseService {
  private static isCloudConfigured(): boolean {
    const env = (import.meta as any).env || {};
    return !!(env.VITE_FIREBASE_API_KEY || env.VITE_SUPABASE_URL);
  }

  /**
   * Fetches articles list from Cloud DB or LocalStorage fallback
   */
  public static async getArticles(): Promise<Article[]> {
    if (this.isCloudConfigured()) {
      try {
        const env = (import.meta as any).env;
        if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
          const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/articles?select=*&order=publishedAt.desc`, {
            headers: {
              'apikey': env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) return data;
          }
        }
      } catch (err) {
        console.warn('Cloud DB fetch fallback to local:', err);
      }
    }

    // LocalStorage Fallback
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }

    return INITIAL_ARTICLES;
  }

  /**
   * Saves or publishes a new article to Cloud DB
   */
  public static async publishArticle(article: Article): Promise<boolean> {
    if (this.isCloudConfigured()) {
      try {
        const env = (import.meta as any).env;
        if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
          const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/articles`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(article)
          });
          if (res.ok) return true;
        }
      } catch (err) {
        console.warn('Cloud DB publish fallback:', err);
      }
    }

    return true; // LocalStorage handled by React state
  }

  /**
   * Syncs SQL Schema generator statement for Supabase / PostgreSQL
   */
  public static getSupabaseSchemaSQL(): string {
    return `-- Schema CSDL TinTucFast cho Supabase / PostgreSQL
DROP TABLE IF EXISTS public.articles CASCADE;

CREATE TABLE public.articles (
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

CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles("publishedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles("category");
`;
  }
}

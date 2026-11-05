export type ArticleCategory = string;

export interface Comment {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  createdAt: string;
  likes: number;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: ArticleCategory;
  coverUrl: string;
  author: {
    name: string;
    avatar?: string;
    role?: string;
  };
  publishedAt: string;
  readTimeMinutes: number;
  views: number;
  likes: number;
  isFeatured?: boolean;
  status?: 'published' | 'draft';
  tags: string[];
  commentsCount: number;
  comments: Comment[];
  isBookmarked?: boolean;
}

export interface UserPermissions {
  canPublishArticles: boolean;
  canEditArticles: boolean;
  canDeleteArticles: boolean;
  canManageCategories: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
}

export interface ManagedUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  role: 'super_admin' | 'admin' | 'editor' | 'author' | 'contributor';
  status: 'active' | 'suspended';
  createdAt: string;
  permissions: UserPermissions;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  role: 'admin' | 'editor' | 'super_admin';
}

export interface SecurityStats {
  totalRequests: number;
  blockedBotRequests: number;
  rateLimitedRequests: number;
  honeypotCatches: number;
  bandwidthSavedKB: number;
  activeRulesCount: number;
  lastUpdated: string;
}

export interface ThreatLog {
  id: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  type: 'AI_BOT_BLOCKED' | 'RATE_LIMITED' | 'HONEYPOT_TRIGGERED' | 'XSS_ATTEMPT';
  detail: string;
  action: string;
}

export interface BotRules {
  [key: string]: boolean;
}

export interface ReaderSettings {
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  fontStyle: 'sans' | 'serif';
  theme: 'light' | 'dark' | 'system';
  speechRate: number;
}

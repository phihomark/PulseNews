import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { ManagedUser, UserPermissions } from '../types';
import { getSupabaseClient } from './supabaseService';

const USERS_STORAGE_KEY = 'tintuc_managed_users_v1';
const SYS_USERS_ARTICLE_ID = '__sys_managed_users__';

// Primary Super Admin Gmail (owner account)
export const PRIMARY_SUPER_ADMIN_EMAILS = ['honguyen6492@gmail.com'];

export const DEFAULT_PERMISSIONS: Record<ManagedUser['role'], UserPermissions> = {
  super_admin: {
    canPublishArticles: true,
    canEditArticles: true,
    canDeleteArticles: true,
    canManageCategories: true,
    canManageSettings: true,
    canManageUsers: true,
  },
  admin: {
    canPublishArticles: true,
    canEditArticles: true,
    canDeleteArticles: true,
    canManageCategories: true,
    canManageSettings: true,
    canManageUsers: false,
  },
  editor: {
    canPublishArticles: true,
    canEditArticles: true,
    canDeleteArticles: true,
    canManageCategories: true,
    canManageSettings: false,
    canManageUsers: false,
  },
  author: {
    canPublishArticles: true,
    canEditArticles: true,
    canDeleteArticles: false,
    canManageCategories: false,
    canManageSettings: false,
    canManageUsers: false,
  },
  contributor: {
    canPublishArticles: true,
    canEditArticles: false,
    canDeleteArticles: false,
    canManageCategories: false,
    canManageSettings: false,
    canManageUsers: false,
  },
};

export const INITIAL_USERS: ManagedUser[] = [];

export function getAllUsers(): ManagedUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Error reading managed users from localStorage:', err);
  }
  return [];
}

export function saveAllUsers(users: ManagedUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving managed users to localStorage:', err);
  }
}

/**
 * Prepares a ManagedUser row matching the exact columns of Supabase `public.managed_users`
 */
function toSupabaseManagedUserRow(user: ManagedUser): Record<string, any> {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email.trim().toLowerCase(),
    avatar: user.avatar,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt || new Date().toISOString(),
    permissions: user.permissions || {
      ...(DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS.contributor),
    },
  };
}

/**
 * Fallback storage inside Supabase `public.articles` (`__sys_managed_users__`)
 * if the user has not yet executed `CREATE TABLE public.managed_users` in Supabase SQL Editor.
 */
async function readFallbackUsersFromSupabaseArticles(): Promise<ManagedUser[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('articles')
      .select('content')
      .eq('id', SYS_USERS_ARTICLE_ID)
      .maybeSingle();

    if (error || !data?.content) return null;
    const parsed = JSON.parse(data.content);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeFallbackUsersToSupabaseArticles(users: ManagedUser[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const payload: Record<string, any> = {
    id: SYS_USERS_ARTICLE_ID,
    slug: SYS_USERS_ARTICLE_ID,
    title: '__SYS_MANAGED_USERS__',
    summary: 'System Managed Users Registry',
    content: JSON.stringify(users),
    category: 'System',
    coverUrl: 'https://ui-avatars.com/api/?name=Sys',
    author: { name: 'System', role: 'System', _status: 'draft' },
    publishedAt: '1970-01-01T00:00:00.000Z',
    readTimeMinutes: 1,
    views: 0,
    likes: 0,
    tags: ['system'],
    commentsCount: 0,
    comments: [],
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { error } = await client.from('articles').upsert([payload], { onConflict: 'id' });
      if (!error) return true;
      const missingColMatch =
        error.message?.match(/Could not find the '([^']+)' column/i) ||
        error.message?.match(/column "([^"]+)" of relation "articles" does not exist/i);
      if (missingColMatch && missingColMatch[1] && missingColMatch[1] in payload) {
        delete payload[missingColMatch[1]];
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
 * Fetches managed users from Supabase `public.managed_users` (with automatic fallback in Supabase)
 */
export async function fetchUsersFromSupabase(): Promise<ManagedUser[] | null> {
  const client = getSupabaseClient();
  if (!client) return getAllUsers();

  try {
    const { data, error } = await client
      .from('managed_users')
      .select('*')
      .order('createdAt', { ascending: false });

    if (!error && Array.isArray(data)) {
      const remoteUsers = (data as ManagedUser[]).map((u) => ({
        ...u,
        emailVerified: true,
        permissions: u.permissions || {
          ...(DEFAULT_PERMISSIONS[u.role] || DEFAULT_PERMISSIONS.contributor),
        },
      }));

      // Also merge with any fallback users stored before table creation
      const fallbackUsers = (await readFallbackUsersFromSupabaseArticles()) || [];
      const mergedMap = new Map<string, ManagedUser>();
      fallbackUsers.forEach((fu) => mergedMap.set(fu.email.trim().toLowerCase(), fu));
      remoteUsers.forEach((ru) => mergedMap.set(ru.email.trim().toLowerCase(), ru));

      const merged = Array.from(mergedMap.values());
      if (merged.length > 0) {
        saveAllUsers(merged);
      }
      return merged;
    }

    // If `public.managed_users` table hasn't been created yet in Supabase SQL Editor, read from Supabase fallback
    const fallback = await readFallbackUsersFromSupabaseArticles();
    if (fallback && fallback.length > 0) {
      saveAllUsers(fallback);
      return fallback;
    }

    return getAllUsers();
  } catch {
    return getAllUsers();
  }
}

/**
 * Real-time subscription to Supabase `managed_users` changes
 */
export function subscribeToManagedUsers(
  onUpdate: (users: ManagedUser[]) => void
): (() => void) | null {
  const client = getSupabaseClient();
  let isActive = true;

  const refresh = async () => {
    if (!isActive) return;
    const latest = await fetchUsersFromSupabase();
    if (isActive && latest) {
      onUpdate(latest);
    }
  };

  let channel: any = null;
  if (client) {
    try {
      channel = client
        .channel('public:managed_users:realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'managed_users' },
          () => {
            refresh();
          }
        )
        .subscribe();
    } catch {}
  }

  const handleFocus = () => {
    refresh();
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
 * Upserts a single ManagedUser to Supabase `public.managed_users`
 */
export async function upsertUserToSupabase(user: ManagedUser): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const row = toSupabaseManagedUserRow(user);

  try {
    const { error } = await client.from('managed_users').upsert([row], { onConflict: 'email' });
    if (!error) {
      return true;
    }
  } catch {}

  // If `public.managed_users` table does not exist yet in Supabase, save to Supabase fallback registry
  const current = getAllUsers();
  const cleanEmail = user.email.trim().toLowerCase();
  const nextList = current.some((u) => u.email.trim().toLowerCase() === cleanEmail)
    ? current.map((u) => (u.email.trim().toLowerCase() === cleanEmail ? user : u))
    : [user, ...current];
  return await writeFallbackUsersToSupabaseArticles(nextList);
}

/**
 * Deletes a ManagedUser from Supabase `public.managed_users`
 */
export async function deleteUserFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('managed_users').delete().eq('id', id);
    if (!error) return true;
  } catch {}

  const current = getAllUsers().filter((u) => u.id !== id);
  return await writeFallbackUsersToSupabaseArticles(current);
}

/**
 * Triggers real Google OAuth popup sign-in via Firebase Auth and syncs the user record to Supabase
 */
export async function signInWithGoogleOAuthPopup(): Promise<{
  user: ManagedUser;
  isSuspended: boolean;
  isPendingApproval: boolean;
}> {
  const credential = await signInWithPopup(auth, googleProvider);
  const fbUser = credential.user;

  if (!fbUser || !fbUser.email) {
    await signOut(auth);
    throw new Error('Không thể lấy thông tin địa chỉ Gmail từ tài khoản Google của bạn.');
  }

  return await syncAuthenticatedGmailUser({
    id: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName || fbUser.email.split('@')[0],
    avatar: fbUser.photoURL || undefined,
  });
}

/**
 * Syncs a verified Google OAuth user with Supabase `managed_users`
 */
export async function syncAuthenticatedGmailUser(params: {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
}): Promise<{ user: ManagedUser; isSuspended: boolean; isPendingApproval: boolean }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const emailPrefix = cleanEmail.split('@')[0] || 'user';
  const defaultAvatar =
    params.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      params.displayName || emailPrefix
    )}&background=4f46e5&color=fff&bold=true`;

  // 1. Fetch latest users from Supabase
  const remoteUsers = await fetchUsersFromSupabase();
  const currentUsers = remoteUsers && remoteUsers.length > 0 ? remoteUsers : getAllUsers();

  const isPrimarySuperAdmin = PRIMARY_SUPER_ADMIN_EMAILS.includes(cleanEmail);

  // 2. Check if this Gmail already exists in Supabase `managed_users`
  const existing = currentUsers.find((u) => u.email.trim().toLowerCase() === cleanEmail);

  if (existing) {
    const updatedUser: ManagedUser = {
      ...existing,
      displayName: existing.displayName || params.displayName || emailPrefix,
      avatar: existing.avatar || defaultAvatar,
      emailVerified: true,
      role: isPrimarySuperAdmin ? 'super_admin' : existing.role,
      status: isPrimarySuperAdmin ? 'active' : existing.status,
      permissions: isPrimarySuperAdmin
        ? { ...DEFAULT_PERMISSIONS.super_admin }
        : existing.permissions || { ...DEFAULT_PERMISSIONS[existing.role] },
    };

    const nextList = currentUsers.map((u) =>
      u.email.trim().toLowerCase() === cleanEmail ? updatedUser : u
    );
    saveAllUsers(nextList);
    await upsertUserToSupabase(updatedUser);

    return {
      user: updatedUser,
      isSuspended: updatedUser.status === 'suspended',
      isPendingApproval: updatedUser.status === 'pending',
    };
  }

  // 3. New Gmail account registering for the first time
  const initialRole: ManagedUser['role'] = isPrimarySuperAdmin ? 'super_admin' : 'contributor';
  const initialStatus: ManagedUser['status'] = isPrimarySuperAdmin ? 'active' : 'pending';

  const newUser: ManagedUser = {
    id: params.id || `user-${Date.now()}`,
    username: emailPrefix,
    displayName: params.displayName?.trim() || emailPrefix,
    email: cleanEmail,
    avatar: defaultAvatar,
    role: initialRole,
    status: initialStatus,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    permissions: { ...DEFAULT_PERMISSIONS[initialRole] },
  };

  const updatedList = [newUser, ...currentUsers];
  saveAllUsers(updatedList);
  await upsertUserToSupabase(newUser);

  return {
    user: newUser,
    isSuspended: false,
    isPendingApproval: initialStatus === 'pending',
  };
}

export function createUser(user: Omit<ManagedUser, 'id' | 'createdAt'>): ManagedUser[] {
  const current = getAllUsers();
  const cleanEmail = user.email.trim().toLowerCase();
  const existingIdx = current.findIndex((u) => u.email.trim().toLowerCase() === cleanEmail);

  const newUser: ManagedUser = {
    ...user,
    email: cleanEmail,
    emailVerified: true,
    id: existingIdx >= 0 ? current[existingIdx].id : `user-${Date.now()}`,
    createdAt: existingIdx >= 0 ? current[existingIdx].createdAt : new Date().toISOString(),
  };

  const updated =
    existingIdx >= 0
      ? current.map((u, idx) => (idx === existingIdx ? newUser : u))
      : [newUser, ...current];

  saveAllUsers(updated);
  upsertUserToSupabase(newUser);
  return updated;
}

export function updateUser(id: string, updates: Partial<ManagedUser>): ManagedUser[] {
  const current = getAllUsers();
  let updatedTarget: ManagedUser | null = null;
  const updated = current.map((u) => {
    if (u.id === id) {
      updatedTarget = {
        ...u,
        ...updates,
        permissions: updates.permissions ? { ...updates.permissions } : { ...u.permissions },
      };
      return updatedTarget;
    }
    return u;
  });
  saveAllUsers(updated);
  if (updatedTarget) {
    upsertUserToSupabase(updatedTarget);
  }
  return updated;
}

export function deleteUser(id: string): ManagedUser[] {
  const current = getAllUsers();
  const updated = current.filter((u) => u.id !== id);
  saveAllUsers(updated);
  deleteUserFromSupabase(id);
  return updated;
}

export function togglePermission(userId: string, permKey: keyof UserPermissions): ManagedUser[] {
  const current = getAllUsers();
  let updatedTarget: ManagedUser | null = null;
  const updated = current.map((u) => {
    if (u.id === userId) {
      updatedTarget = {
        ...u,
        permissions: {
          ...u.permissions,
          [permKey]: !u.permissions[permKey],
        },
      };
      return updatedTarget;
    }
    return u;
  });
  saveAllUsers(updated);
  if (updatedTarget) {
    upsertUserToSupabase(updatedTarget);
  }
  return updated;
}

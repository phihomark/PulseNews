import { signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { ManagedUser, UserPermissions } from '../types';
import { getSupabaseClient } from './supabaseService';

const USERS_STORAGE_KEY = 'tintuc_managed_users_v2';
const LEGACY_USERS_STORAGE_KEY = 'tintuc_managed_users_v1';
const SYS_USERS_ARTICLE_ID = '__sys_managed_users__';
const FIRESTORE_USERS_COLLECTION = 'managed_users';

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

function sanitizeDocId(rawId: string): string {
  const cleaned = rawId.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || `user_${Date.now()}`;
}

/**
 * Normalizes a user record and heals any stale 'suspended' status that was not explicitly set with `_suspendedByAdmin`
 */
function normalizeUserRecord(u: ManagedUser): ManagedUser {
  const cleanEmail = u.email.trim().toLowerCase();
  const isPrimary = PRIMARY_SUPER_ADMIN_EMAILS.includes(cleanEmail);
  const role: ManagedUser['role'] = isPrimary ? 'super_admin' : u.role || 'contributor';
  const rawPerms = (u.permissions || {}) as Record<string, any>;
  const defaultPerms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.contributor;

  // Heal stale 'suspended' status unless `_suspendedByAdmin` was explicitly set
  let resolvedStatus: ManagedUser['status'] = u.status || 'active';
  if (isPrimary) {
    resolvedStatus = 'active';
  } else if (resolvedStatus === 'suspended' && rawPerms._suspendedByAdmin !== true) {
    resolvedStatus = 'active';
  }

  const permissions: UserPermissions & { _suspendedByAdmin?: boolean } = {
    canPublishArticles: isPrimary
      ? true
      : Boolean(rawPerms.canPublishArticles ?? defaultPerms.canPublishArticles),
    canEditArticles: isPrimary
      ? true
      : Boolean(rawPerms.canEditArticles ?? defaultPerms.canEditArticles),
    canDeleteArticles: isPrimary
      ? true
      : Boolean(rawPerms.canDeleteArticles ?? defaultPerms.canDeleteArticles),
    canManageCategories: isPrimary
      ? true
      : Boolean(rawPerms.canManageCategories ?? defaultPerms.canManageCategories),
    canManageSettings: isPrimary
      ? true
      : Boolean(rawPerms.canManageSettings ?? defaultPerms.canManageSettings),
    canManageUsers: isPrimary
      ? true
      : Boolean(rawPerms.canManageUsers ?? defaultPerms.canManageUsers),
  };

  if (resolvedStatus === 'suspended') {
    permissions._suspendedByAdmin = true;
  }

  return {
    ...u,
    email: cleanEmail,
    role,
    status: resolvedStatus,
    emailVerified: true,
    permissions,
  };
}

/**
 * Deduplicates users by email, ensuring newer updates win
 */
function deduplicateUsersByEmail(users: ManagedUser[]): ManagedUser[] {
  const map = new Map<string, ManagedUser>();
  for (const rawUser of users) {
    if (!rawUser || !rawUser.email) continue;
    const normalized = normalizeUserRecord(rawUser);
    const cleanEmail = normalized.email;

    const existing = map.get(cleanEmail);
    if (!existing) {
      map.set(cleanEmail, normalized);
    } else {
      const existingTime = new Date(existing.createdAt || 0).getTime();
      const newTime = new Date(normalized.createdAt || 0).getTime();
      if (newTime >= existingTime) {
        map.set(cleanEmail, normalized);
      }
    }
  }
  return Array.from(map.values());
}

export function getAllUsers(): ManagedUser[] {
  try {
    const raw =
      localStorage.getItem(USERS_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const deduped = deduplicateUsersByEmail(parsed);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(deduped));
        return deduped;
      }
    }
  } catch (err) {
    console.warn('Error reading managed users from localStorage:', err);
  }
  return [];
}

export function saveAllUsers(users: ManagedUser[]): void {
  try {
    const deduped = deduplicateUsersByEmail(users);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(deduped));
  } catch (err) {
    console.error('Error saving managed users to localStorage:', err);
  }
}

/**
 * Prepares a ManagedUser row matching the exact columns of Supabase `public.managed_users`
 */
function toSupabaseManagedUserRow(user: ManagedUser): Record<string, any> {
  const normalized = normalizeUserRecord(user);
  return {
    id: normalized.id,
    username: normalized.username,
    displayName: normalized.displayName,
    email: normalized.email,
    avatar: normalized.avatar,
    role: normalized.role,
    status: normalized.status,
    createdAt: normalized.createdAt || new Date().toISOString(),
    permissions: normalized.permissions,
  };
}

/**
 * Fallback storage inside Supabase `public.articles` (`__sys_managed_users__`)
 * if `public.managed_users` table has not been created yet in Supabase SQL Editor.
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
    return Array.isArray(parsed) ? deduplicateUsersByEmail(parsed) : null;
  } catch {
    return null;
  }
}

async function writeFallbackUsersToSupabaseArticles(users: ManagedUser[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const deduped = deduplicateUsersByEmail(users);
  const payload: Record<string, any> = {
    id: SYS_USERS_ARTICLE_ID,
    slug: SYS_USERS_ARTICLE_ID,
    title: '__SYS_MANAGED_USERS__',
    summary: 'System Managed Users Registry',
    content: JSON.stringify(deduped),
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
 * Syncs a user record to Firestore bridge
 */
async function syncUserToFirestoreBridge(user: ManagedUser): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const normalized = normalizeUserRecord(user);
    const safeId = sanitizeDocId(normalized.id || auth.currentUser.uid);
    const emailPrefix = normalized.email.split('@')[0] || 'user';
    await setDoc(doc(db, FIRESTORE_USERS_COLLECTION, safeId), {
      id: safeId,
      uid: sanitizeDocId(auth.currentUser.uid),
      username: (normalized.username || emailPrefix).trim().slice(0, 64) || 'user',
      displayName: (normalized.displayName || emailPrefix).trim().slice(0, 120) || 'User',
      email: normalized.email.slice(0, 160),
      avatar: (
        normalized.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(normalized.displayName || 'User')}&background=4f46e5&color=fff&bold=true`
      )
        .trim()
        .slice(0, 500),
      role: normalized.role,
      status: normalized.status,
      emailVerified: true,
      canPublishArticles: Boolean(normalized.permissions.canPublishArticles),
      canEditArticles: Boolean(normalized.permissions.canEditArticles),
      canDeleteArticles: Boolean(normalized.permissions.canDeleteArticles),
      canManageCategories: Boolean(normalized.permissions.canManageCategories),
      canManageSettings: Boolean(normalized.permissions.canManageSettings),
      canManageUsers: Boolean(normalized.permissions.canManageUsers),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {}
}

/**
 * Fetches managed users from Supabase `public.managed_users` (primary) and heals any stale status rows
 */
export async function fetchUsersFromSupabase(): Promise<ManagedUser[] | null> {
  const client = getSupabaseClient();
  const localUsers = getAllUsers();

  if (client) {
    try {
      const { data, error } = await client
        .from('managed_users')
        .select('*')
        .order('createdAt', { ascending: true });

      const fallbackUsers = (await readFallbackUsersFromSupabaseArticles()) || [];

      if (!error && Array.isArray(data) && data.length > 0) {
        const rawRows = data as ManagedUser[];
        const healedUsers: ManagedUser[] = [];

        for (const rawRow of rawRows) {
          const normalized = normalizeUserRecord(rawRow);
          healedUsers.push(normalized);
          // If a row in Supabase had a stale 'suspended' status that was healed to 'active', update Supabase immediately
          if (rawRow.status === 'suspended' && normalized.status === 'active') {
            client
              .from('managed_users')
              .update({
                status: 'active',
                permissions: normalized.permissions,
              })
              .eq('id', rawRow.id)
              .then(() => {});
          }
        }

        const merged = deduplicateUsersByEmail([
          ...localUsers,
          ...fallbackUsers,
          ...healedUsers,
        ]);
        saveAllUsers(merged);
        return merged;
      }

      if (fallbackUsers.length > 0) {
        const merged = deduplicateUsersByEmail([...localUsers, ...fallbackUsers]);
        saveAllUsers(merged);
        return merged;
      }
    } catch {}
  }

  // Fallback for preview environment when Supabase env vars are not set
  if (auth.currentUser) {
    const currentEmail = auth.currentUser.email?.trim().toLowerCase() || '';
    if (PRIMARY_SUPER_ADMIN_EMAILS.includes(currentEmail)) {
      try {
        const snap = await getDocs(collection(db, FIRESTORE_USERS_COLLECTION));
        const fsUsers: ManagedUser[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const role: ManagedUser['role'] = data.role || 'contributor';
          const perms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.contributor;
          fsUsers.push(
            normalizeUserRecord({
              id: data.id || d.id,
              username: data.username || 'user',
              displayName: data.displayName || 'User',
              email: String(data.email || '').trim().toLowerCase(),
              avatar: data.avatar || '',
              role,
              status: data.status === 'pending' ? 'pending' : 'active',
              emailVerified: true,
              createdAt: new Date().toISOString(),
              permissions: {
                canPublishArticles: Boolean(data.canPublishArticles ?? perms.canPublishArticles),
                canEditArticles: Boolean(data.canEditArticles ?? perms.canEditArticles),
                canDeleteArticles: Boolean(data.canDeleteArticles ?? perms.canDeleteArticles),
                canManageCategories: Boolean(data.canManageCategories ?? perms.canManageCategories),
                canManageSettings: Boolean(data.canManageSettings ?? perms.canManageSettings),
                canManageUsers: Boolean(data.canManageUsers ?? perms.canManageUsers),
              },
            })
          );
        });
        if (fsUsers.length > 0) {
          const merged = deduplicateUsersByEmail([...localUsers, ...fsUsers]);
          saveAllUsers(merged);
          return merged;
        }
      } catch {}
    }
  }

  return localUsers;
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
 * Upserts a single ManagedUser to Supabase `public.managed_users` by email without mutating Primary Key `id`
 */
export async function upsertUserToSupabase(user: ManagedUser): Promise<boolean> {
  const normalized = normalizeUserRecord(user);
  const cleanEmail = normalized.email;
  const current = getAllUsers();
  const nextList = current.some((u) => u.email.trim().toLowerCase() === cleanEmail)
    ? current.map((u) => (u.email.trim().toLowerCase() === cleanEmail ? normalized : u))
    : [normalized, ...current];

  saveAllUsers(nextList);
  syncUserToFirestoreBridge(normalized).catch(() => {});

  const client = getSupabaseClient();
  if (!client) return false;

  await writeFallbackUsersToSupabaseArticles(nextList);

  const row = toSupabaseManagedUserRow(normalized);

  try {
    const { data: existingRows, error: selectErr } = await client
      .from('managed_users')
      .select('id, email')
      .ilike('email', cleanEmail);

    if (!selectErr && Array.isArray(existingRows) && existingRows.length > 0) {
      const primaryId = existingRows[0].id;
      const { id: _ignoreId, ...updateFields } = row;

      const { error: updateErr } = await client
        .from('managed_users')
        .update(updateFields)
        .eq('id', primaryId);

      if (existingRows.length > 1) {
        for (let i = 1; i < existingRows.length; i++) {
          await client.from('managed_users').delete().eq('id', existingRows[i].id);
        }
      }

      if (!updateErr) return true;
    } else if (!selectErr) {
      const { error: insertErr } = await client.from('managed_users').insert([row]);
      if (!insertErr) return true;
    }
  } catch {}

  return true;
}

/**
 * Deletes a ManagedUser from Supabase `public.managed_users` by id and email
 */
export async function deleteUserFromSupabase(id: string, email?: string): Promise<boolean> {
  const current = getAllUsers().filter(
    (u) => u.id !== id && (!email || u.email.trim().toLowerCase() !== email.trim().toLowerCase())
  );
  saveAllUsers(current);

  if (auth.currentUser) {
    deleteDoc(doc(db, FIRESTORE_USERS_COLLECTION, sanitizeDocId(id))).catch(() => {});
  }

  const client = getSupabaseClient();
  if (!client) return false;

  await writeFallbackUsersToSupabaseArticles(current);

  try {
    await client.from('managed_users').delete().eq('id', id);
    if (email) {
      await client.from('managed_users').delete().ilike('email', email.trim().toLowerCase());
    }
    return true;
  } catch {
    return false;
  }
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

  const remoteUsers = await fetchUsersFromSupabase();
  const currentUsers = remoteUsers && remoteUsers.length > 0 ? remoteUsers : getAllUsers();
  const isPrimarySuperAdmin = PRIMARY_SUPER_ADMIN_EMAILS.includes(cleanEmail);

  const existing = currentUsers.find((u) => u.email.trim().toLowerCase() === cleanEmail);

  if (existing) {
    const normalizedExisting = normalizeUserRecord(existing);
    const updatedUser: ManagedUser = {
      ...normalizedExisting,
      displayName: normalizedExisting.displayName || params.displayName || emailPrefix,
      avatar: normalizedExisting.avatar || defaultAvatar,
      emailVerified: true,
      role: isPrimarySuperAdmin ? 'super_admin' : normalizedExisting.role,
      status: isPrimarySuperAdmin ? 'active' : normalizedExisting.status,
      permissions: isPrimarySuperAdmin
        ? { ...DEFAULT_PERMISSIONS.super_admin }
        : normalizedExisting.permissions,
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

  const rawPermissions = {
    ...user.permissions,
    ...(user.status === 'suspended' ? { _suspendedByAdmin: true } : { _suspendedByAdmin: false }),
  } as UserPermissions;

  const newUser = normalizeUserRecord({
    ...user,
    email: cleanEmail,
    emailVerified: true,
    permissions: rawPermissions,
    id: existingIdx >= 0 ? current[existingIdx].id : `user-${Date.now()}`,
    createdAt: new Date().toISOString(),
  });

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
  const targetById = current.find((u) => u.id === id);
  const targetEmail = (updates.email || targetById?.email || '').trim().toLowerCase();

  let updatedTarget: ManagedUser | null = null;
  const updated = current.map((u) => {
    const isMatch =
      u.id === id || (targetEmail && u.email.trim().toLowerCase() === targetEmail);
    if (isMatch) {
      const nextStatus = updates.status !== undefined ? updates.status : u.status;
      const basePerms = updates.permissions ? { ...updates.permissions } : { ...u.permissions };
      const nextPerms = {
        ...basePerms,
        _suspendedByAdmin: nextStatus === 'suspended',
      } as UserPermissions;

      updatedTarget = normalizeUserRecord({
        ...u,
        ...updates,
        status: nextStatus,
        createdAt: new Date().toISOString(),
        permissions: nextPerms,
      });
      return updatedTarget;
    }
    return u;
  });

  const deduped = deduplicateUsersByEmail(updated);
  saveAllUsers(deduped);

  if (updatedTarget) {
    upsertUserToSupabase(updatedTarget);
  }
  return deduped;
}

export function deleteUser(id: string): ManagedUser[] {
  const current = getAllUsers();
  const target = current.find((u) => u.id === id);
  const updated = current.filter(
    (u) =>
      u.id !== id &&
      (!target || u.email.trim().toLowerCase() !== target.email.trim().toLowerCase())
  );
  saveAllUsers(updated);
  deleteUserFromSupabase(id, target?.email);
  return updated;
}

export function togglePermission(userId: string, permKey: keyof UserPermissions): ManagedUser[] {
  const current = getAllUsers();
  const target = current.find((u) => u.id === userId);
  if (!target) return current;

  const nextPermissions: UserPermissions = {
    ...target.permissions,
    [permKey]: !target.permissions[permKey],
  };

  return updateUser(userId, { permissions: nextPermissions });
}

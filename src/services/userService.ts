import { ManagedUser, UserPermissions } from '../types';
import { getSupabaseClient } from './supabaseService';

const USERS_STORAGE_KEY = 'tintuc_managed_users_v1';
const UNVERIFIED_EMAILS_KEY = 'tintuc_unverified_gmail_map';

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

/**
 * Tracks emails that have registered but have NOT yet completed Gmail OTP / Link verification
 */
export function markEmailPendingOtpVerification(email: string): void {
  try {
    const clean = email.trim().toLowerCase();
    const raw = localStorage.getItem(UNVERIFIED_EMAILS_KEY);
    const map: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    map[clean] = true;
    localStorage.setItem(UNVERIFIED_EMAILS_KEY, JSON.stringify(map));
  } catch {}
}

export function markEmailOtpVerified(email: string): void {
  try {
    const clean = email.trim().toLowerCase();
    const raw = localStorage.getItem(UNVERIFIED_EMAILS_KEY);
    if (!raw) return;
    const map: Record<string, boolean> = JSON.parse(raw);
    delete map[clean];
    localStorage.setItem(UNVERIFIED_EMAILS_KEY, JSON.stringify(map));
  } catch {}
}

export function isEmailPendingOtpVerification(email: string): boolean {
  try {
    const clean = email.trim().toLowerCase();
    const raw = localStorage.getItem(UNVERIFIED_EMAILS_KEY);
    if (!raw) return false;
    const map: Record<string, boolean> = JSON.parse(raw);
    return Boolean(map[clean]);
  } catch {
    return false;
  }
}

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
 * Fetches managed users from Supabase table `managed_users` if available
 */
export async function fetchUsersFromSupabase(): Promise<ManagedUser[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('managed_users')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error || !data) return null;

    const users = (data as ManagedUser[]).map(u => ({
      ...u,
      permissions: u.permissions || { ...(DEFAULT_PERMISSIONS[u.role] || DEFAULT_PERMISSIONS.contributor) }
    }));
    if (users.length > 0) {
      saveAllUsers(users);
    }
    return users;
  } catch {
    return null;
  }
}

/**
 * Upserts a single ManagedUser to Supabase `managed_users`
 */
export async function upsertUserToSupabase(user: ManagedUser): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('managed_users')
      .upsert([user], { onConflict: 'email' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Deletes a ManagedUser from Supabase `managed_users`
 */
export async function deleteUserFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('managed_users')
      .delete()
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Syncs a verified Gmail user (after OTP / Email Link / Google OAuth verification) with `managed_users`
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
    `https://ui-avatars.com/api/?name=${encodeURIComponent(params.displayName || emailPrefix)}&background=4f46e5&color=fff&bold=true`;

  // 1. Fetch latest users from Supabase if connected
  const remoteUsers = await fetchUsersFromSupabase();
  const currentUsers = remoteUsers && remoteUsers.length > 0 ? remoteUsers : getAllUsers();

  const isPrimarySuperAdmin = PRIMARY_SUPER_ADMIN_EMAILS.includes(cleanEmail);

  // 2. Check if this Gmail already exists in managed_users
  const existing = currentUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);

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

    const nextList = currentUsers.map(u =>
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
  // Only the primary owner Gmail becomes 'active' super_admin automatically;
  // other self-registered accounts start as 'pending' until approved by an Admin in User Management.
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
  const existingIdx = current.findIndex(u => u.email.trim().toLowerCase() === cleanEmail);

  const newUser: ManagedUser = {
    ...user,
    email: cleanEmail,
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
  const updated = current.map(u => {
    if (u.id === id) {
      updatedTarget = { ...u, ...updates };
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
  const updated = current.filter(u => u.id !== id);
  saveAllUsers(updated);
  deleteUserFromSupabase(id);
  return updated;
}

export function togglePermission(userId: string, permKey: keyof UserPermissions): ManagedUser[] {
  const current = getAllUsers();
  let updatedTarget: ManagedUser | null = null;
  const updated = current.map(u => {
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

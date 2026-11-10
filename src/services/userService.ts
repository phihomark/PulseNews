import { ManagedUser, UserPermissions } from '../types';
import { getSupabaseClient } from './supabaseService';

const USERS_STORAGE_KEY = 'tintuc_managed_users_v1';
const UNVERIFIED_EMAILS_KEY = 'tintuc_unverified_gmail_map';
const CREDENTIALS_MAP_KEY = 'tintuc_gmail_auth_records_v1';
const OTP_STORE_KEY = 'tintuc_gmail_otp_codes_v1';

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

interface StoredGmailAccount {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
}

interface StoredOtpRecord {
  code: string;
  expiresAt: number;
}

function simpleHashPassword(pw: string, salt: string): string {
  const combined = `${salt.toLowerCase()}::${pw}::pulsenews_salt`;
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 33) ^ combined.charCodeAt(i);
  }
  return `h_${(hash >>> 0).toString(16)}_${combined.length}`;
}

function getStoredAccountsMap(): Record<string, StoredGmailAccount> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredAccountsMap(map: Record<string, StoredGmailAccount>): void {
  try {
    localStorage.setItem(CREDENTIALS_MAP_KEY, JSON.stringify(map));
  } catch {}
}

function getOtpStore(): Record<string, StoredOtpRecord> {
  try {
    const raw = localStorage.getItem(OTP_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOtpStore(store: Record<string, StoredOtpRecord>): void {
  try {
    localStorage.setItem(OTP_STORE_KEY, JSON.stringify(store));
  } catch {}
}

export function generateOtpForEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const store = getOtpStore();
  store[clean] = {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  };
  saveOtpStore(store);
  return code;
}

export function verifyLocalOtpForEmail(email: string, inputCode: string): boolean {
  const clean = email.trim().toLowerCase();
  const store = getOtpStore();
  const record = store[clean];
  if (!record) return false;
  if (Date.now() > record.expiresAt) return false;
  if (record.code === inputCode.trim()) {
    delete store[clean];
    saveOtpStore(store);
    return true;
  }
  return false;
}

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
    if (raw) {
      const map: Record<string, boolean> = JSON.parse(raw);
      delete map[clean];
      localStorage.setItem(UNVERIFIED_EMAILS_KEY, JSON.stringify(map));
    }
    const accounts = getStoredAccountsMap();
    if (accounts[clean]) {
      accounts[clean].emailVerified = true;
      saveStoredAccountsMap(accounts);
    }
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
      // Merge remote users with any local users
      const local = getAllUsers();
      const mergedMap = new Map<string, ManagedUser>();
      local.forEach(lu => mergedMap.set(lu.email.trim().toLowerCase(), lu));
      users.forEach(ru => mergedMap.set(ru.email.trim().toLowerCase(), ru));
      const merged = Array.from(mergedMap.values());
      saveAllUsers(merged);
      return merged;
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
 * Registers a new Gmail user, generates a 6-digit OTP verification code,
 * and syncs with Supabase Auth (if configured) + ManagedUser list.
 */
export async function registerGmailUserWithOtp(params: {
  displayName: string;
  email: string;
  password: string;
}): Promise<{
  success: boolean;
  otpCode: string;
  emailSentViaSupabase: boolean;
  error?: string;
}> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.displayName.trim();
  const emailPrefix = cleanEmail.split('@')[0] || 'user';

  // Generate 6-digit OTP code for verification
  const otpCode = generateOtpForEmail(cleanEmail);
  markEmailPendingOtpVerification(cleanEmail);

  // Save hashed credentials locally so login works reliably even without external SMTP
  const accounts = getStoredAccountsMap();
  const userId = accounts[cleanEmail]?.id || `user-${Date.now()}`;
  accounts[cleanEmail] = {
    id: userId,
    email: cleanEmail,
    displayName: cleanName,
    passwordHash: simpleHashPassword(params.password, cleanEmail),
    emailVerified: false,
    createdAt: accounts[cleanEmail]?.createdAt || new Date().toISOString(),
  };
  saveStoredAccountsMap(accounts);

  // Also pre-create the user in managed_users as 'pending' (or 'active' if Primary Super Admin)
  const isPrimarySuperAdmin = PRIMARY_SUPER_ADMIN_EMAILS.includes(cleanEmail);
  const currentUsers = getAllUsers();
  const existing = currentUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);

  const initialRole: ManagedUser['role'] = isPrimarySuperAdmin
    ? 'super_admin'
    : existing?.role || 'contributor';
  const initialStatus: ManagedUser['status'] = isPrimarySuperAdmin
    ? 'active'
    : existing?.status || 'pending';

  const managedRecord: ManagedUser = {
    id: existing?.id || userId,
    username: existing?.username || emailPrefix,
    displayName: cleanName || existing?.displayName || emailPrefix,
    email: cleanEmail,
    avatar:
      existing?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName || emailPrefix)}&background=4f46e5&color=fff&bold=true`,
    role: initialRole,
    status: initialStatus,
    emailVerified: false,
    createdAt: existing?.createdAt || new Date().toISOString(),
    permissions: isPrimarySuperAdmin
      ? { ...DEFAULT_PERMISSIONS.super_admin }
      : existing?.permissions || { ...DEFAULT_PERMISSIONS[initialRole] },
  };

  const nextUsers = existing
    ? currentUsers.map(u => (u.email.trim().toLowerCase() === cleanEmail ? managedRecord : u))
    : [managedRecord, ...currentUsers];
  saveAllUsers(nextUsers);
  upsertUserToSupabase(managedRecord);

  // Try Supabase Auth signUp if Supabase is configured
  let emailSentViaSupabase = false;
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      sessionStorage.setItem('suppress_auto_auth_listener', 'true');
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
          data: { full_name: cleanName },
        },
      });

      if (!error) {
        if (data.session) {
          // Confirm email was off in Supabase dashboard -> sign out temporary session & trigger OTP email
          await supabase.auth.signOut();
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              shouldCreateUser: false,
              emailRedirectTo: `${window.location.origin}/admin`,
            },
          });
          emailSentViaSupabase = !otpErr;
        } else {
          emailSentViaSupabase = true;
        }
      }
    } catch {
      // Fallback to built-in OTP verification
    } finally {
      sessionStorage.removeItem('suppress_auto_auth_listener');
    }
  }

  return {
    success: true,
    otpCode,
    emailSentViaSupabase,
  };
}

/**
 * Authenticates Gmail + Password against Supabase Auth (if connected) and local encrypted store
 */
export async function authenticateGmailPassword(params: {
  email: string;
  password: string;
}): Promise<{
  success: boolean;
  needsOtpVerification?: boolean;
  otpCode?: string;
  user?: { id: string; email: string; displayName: string; avatar?: string };
  errorMessage?: string;
}> {
  const cleanEmail = params.email.trim().toLowerCase();

  // 1. Check if this email has a pending unverified OTP registration
  if (isEmailPendingOtpVerification(cleanEmail)) {
    const newOtp = generateOtpForEmail(cleanEmail);
    return {
      success: false,
      needsOtpVerification: true,
      otpCode: newOtp,
    };
  }

  // 2. Check local registered Gmail credentials first
  const accounts = getStoredAccountsMap();
  const localAccount = accounts[cleanEmail];

  if (localAccount) {
    const expectedHash = simpleHashPassword(params.password, cleanEmail);
    if (localAccount.passwordHash !== expectedHash) {
      return {
        success: false,
        errorMessage: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại hoặc bấm "Nhận OTP qua Gmail".',
      };
    }

    if (!localAccount.emailVerified) {
      markEmailPendingOtpVerification(cleanEmail);
      const newOtp = generateOtpForEmail(cleanEmail);
      return {
        success: false,
        needsOtpVerification: true,
        otpCode: newOtp,
      };
    }

    return {
      success: true,
      user: {
        id: localAccount.id,
        email: localAccount.email,
        displayName: localAccount.displayName,
      },
    };
  }

  // 3. Try Supabase Auth if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      sessionStorage.setItem('suppress_auto_auth_listener', 'true');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: params.password,
      });
      sessionStorage.removeItem('suppress_auto_auth_listener');

      if (!error && data.user) {
        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            displayName:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              cleanEmail.split('@')[0],
            avatar: data.user.user_metadata?.avatar_url,
          },
        };
      }

      if (error?.message.toLowerCase().includes('email not confirmed')) {
        markEmailPendingOtpVerification(cleanEmail);
        const newOtp = generateOtpForEmail(cleanEmail);
        return {
          success: false,
          needsOtpVerification: true,
          otpCode: newOtp,
        };
      }
    } catch {
      sessionStorage.removeItem('suppress_auto_auth_listener');
    }
  }

  return {
    success: false,
    errorMessage:
      'Tài khoản Gmail này chưa được đăng ký hoặc mật khẩu không đúng. Vui lòng chuyển sang tab "Đăng ký bằng Gmail" để tạo tài khoản mới!',
  };
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

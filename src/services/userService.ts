import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { ManagedUser, UserPermissions } from '../types';
import { getSupabaseClient } from './supabaseService';

const USERS_STORAGE_KEY = 'tintuc_managed_users_v1';
const MANAGED_USERS_COLLECTION = 'managed_users';
const ADMINS_COLLECTION = 'admins';

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

function mapFirestoreDocToManagedUser(docId: string, data: Record<string, any>): ManagedUser {
  const role: ManagedUser['role'] =
    data.role && ['super_admin', 'admin', 'editor', 'author', 'contributor'].includes(data.role)
      ? data.role
      : 'contributor';
  const fallbackPerms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.contributor;

  let createdAtIso = new Date().toISOString();
  if (data.createdAt?.toDate) {
    createdAtIso = data.createdAt.toDate().toISOString();
  } else if (typeof data.createdAt === 'string') {
    createdAtIso = data.createdAt;
  }

  return {
    id: data.id || docId,
    username: String(data.username || data.email?.split('@')[0] || 'user').slice(0, 64),
    displayName: String(data.displayName || data.username || 'User').slice(0, 120),
    email: String(data.email || '').trim().toLowerCase().slice(0, 160),
    avatar: String(
      data.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'User')}&background=4f46e5&color=fff&bold=true`
    ).slice(0, 500),
    role,
    status:
      data.status && ['active', 'pending', 'suspended'].includes(data.status)
        ? data.status
        : 'pending',
    emailVerified: Boolean(data.emailVerified ?? true),
    createdAt: createdAtIso,
    permissions: {
      canPublishArticles: Boolean(data.canPublishArticles ?? fallbackPerms.canPublishArticles),
      canEditArticles: Boolean(data.canEditArticles ?? fallbackPerms.canEditArticles),
      canDeleteArticles: Boolean(data.canDeleteArticles ?? fallbackPerms.canDeleteArticles),
      canManageCategories: Boolean(data.canManageCategories ?? fallbackPerms.canManageCategories),
      canManageSettings: Boolean(data.canManageSettings ?? fallbackPerms.canManageSettings),
      canManageUsers: Boolean(data.canManageUsers ?? fallbackPerms.canManageUsers),
    },
  };
}

function buildFirestoreCreatePayload(user: ManagedUser, uid: string) {
  const safeId = sanitizeDocId(user.id);
  const safeUid = sanitizeDocId(uid || user.id);
  const emailPrefix = user.email.split('@')[0] || 'user';
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user.displayName || emailPrefix
  )}&background=4f46e5&color=fff&bold=true`;

  return {
    id: safeId,
    uid: safeUid,
    username: (user.username || emailPrefix).trim().slice(0, 64) || 'user',
    displayName: (user.displayName || emailPrefix).trim().slice(0, 120) || 'User',
    email: user.email.trim().toLowerCase().slice(0, 160),
    avatar: (user.avatar || defaultAvatar).trim().slice(0, 500),
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerified ?? true),
    canPublishArticles: Boolean(user.permissions.canPublishArticles),
    canEditArticles: Boolean(user.permissions.canEditArticles),
    canDeleteArticles: Boolean(user.permissions.canDeleteArticles),
    canManageCategories: Boolean(user.permissions.canManageCategories),
    canManageSettings: Boolean(user.permissions.canManageSettings),
    canManageUsers: Boolean(user.permissions.canManageUsers),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
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
 * Real-time subscription to Firestore `managed_users` collection for AdminDashboard
 */
export function subscribeToManagedUsers(
  onUpdate: (users: ManagedUser[]) => void
): Unsubscribe | null {
  if (!auth.currentUser) return null;
  const email = auth.currentUser.email?.trim().toLowerCase() || '';
  if (!PRIMARY_SUPER_ADMIN_EMAILS.includes(email)) {
    return null;
  }

  return onSnapshot(
    collection(db, MANAGED_USERS_COLLECTION),
    (snapshot) => {
      const list: ManagedUser[] = [];
      snapshot.forEach((docSnap) => {
        list.push(mapFirestoreDocToManagedUser(docSnap.id, docSnap.data()));
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      saveAllUsers(list);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, MANAGED_USERS_COLLECTION);
    }
  );
}

/**
 * Fetches managed users from Firestore `managed_users` (and merges with optional Supabase)
 */
export async function fetchUsersFromSupabase(): Promise<ManagedUser[] | null> {
  // 1. If authenticated as Super Admin in Firebase, fetch from Firestore `managed_users`
  if (auth.currentUser) {
    const currentEmail = auth.currentUser.email?.trim().toLowerCase() || '';
    if (PRIMARY_SUPER_ADMIN_EMAILS.includes(currentEmail)) {
      try {
        const snap = await getDocs(collection(db, MANAGED_USERS_COLLECTION));
        const firestoreUsers: ManagedUser[] = [];
        snap.forEach((docSnap) => {
          firestoreUsers.push(mapFirestoreDocToManagedUser(docSnap.id, docSnap.data()));
        });
        if (firestoreUsers.length > 0) {
          firestoreUsers.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          saveAllUsers(firestoreUsers);
          return firestoreUsers;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, MANAGED_USERS_COLLECTION);
      }
    } else {
      // Non-super-admin can read their own user doc
      try {
        const ownDoc = await getDoc(doc(db, MANAGED_USERS_COLLECTION, auth.currentUser.uid));
        if (ownDoc.exists()) {
          const ownUser = mapFirestoreDocToManagedUser(ownDoc.id, ownDoc.data());
          const local = getAllUsers();
          const merged = [
            ownUser,
            ...local.filter((u) => u.email.toLowerCase() !== ownUser.email.toLowerCase()),
          ];
          saveAllUsers(merged);
          return merged;
        }
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.GET,
          `${MANAGED_USERS_COLLECTION}/${auth.currentUser.uid}`
        );
      }
    }
  }

  // 2. Fallback to Supabase if configured
  const client = getSupabaseClient();
  if (!client) return getAllUsers();

  try {
    const { data, error } = await client
      .from('managed_users')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error || !data) return getAllUsers();

    const users = (data as ManagedUser[]).map((u) => ({
      ...u,
      permissions: u.permissions || {
        ...(DEFAULT_PERMISSIONS[u.role] || DEFAULT_PERMISSIONS.contributor),
      },
    }));
    if (users.length > 0) {
      saveAllUsers(users);
      return users;
    }
    return getAllUsers();
  } catch {
    return getAllUsers();
  }
}

/**
 * Triggers real Google OAuth popup sign-in via Firebase Auth and syncs user to Firestore
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
 * Syncs a verified Google OAuth user with Firestore `managed_users/{uid}`
 */
export async function syncAuthenticatedGmailUser(params: {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
}): Promise<{ user: ManagedUser; isSuspended: boolean; isPendingApproval: boolean }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const emailPrefix = cleanEmail.split('@')[0] || 'user';
  const safeId = sanitizeDocId(params.id || auth.currentUser?.uid || `user_${Date.now()}`);
  const defaultAvatar =
    params.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      params.displayName || emailPrefix
    )}&background=4f46e5&color=fff&bold=true`;

  const isPrimarySuperAdmin = PRIMARY_SUPER_ADMIN_EMAILS.includes(cleanEmail);

  // If authenticated with Firebase Auth, read/write Firestore `managed_users/{safeId}`
  if (auth.currentUser && auth.currentUser.uid === safeId) {
    const userDocRef = doc(db, MANAGED_USERS_COLLECTION, safeId);
    let existingSnap;
    try {
      existingSnap = await getDoc(userDocRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${MANAGED_USERS_COLLECTION}/${safeId}`);
    }

    if (existingSnap && existingSnap.exists()) {
      const existingUser = mapFirestoreDocToManagedUser(existingSnap.id, existingSnap.data());

      // If primary owner email, ensure super_admin + active in Firestore if not already set
      if (
        isPrimarySuperAdmin &&
        (existingUser.role !== 'super_admin' || existingUser.status !== 'active')
      ) {
        try {
          await updateDoc(userDocRef, {
            role: 'super_admin',
            status: 'active',
            canPublishArticles: true,
            canEditArticles: true,
            canDeleteArticles: true,
            canManageCategories: true,
            canManageSettings: true,
            canManageUsers: true,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.UPDATE,
            `${MANAGED_USERS_COLLECTION}/${safeId}`
          );
        }
        existingUser.role = 'super_admin';
        existingUser.status = 'active';
        existingUser.permissions = { ...DEFAULT_PERMISSIONS.super_admin };
      }

      const currentLocal = getAllUsers();
      const updatedLocal = [
        existingUser,
        ...currentLocal.filter((u) => u.email.toLowerCase() !== cleanEmail && u.id !== safeId),
      ];
      saveAllUsers(updatedLocal);

      return {
        user: existingUser,
        isSuspended: existingUser.status === 'suspended',
        isPendingApproval: existingUser.status === 'pending',
      };
    }

    // Document does not exist yet -> Create new user in Firestore
    const initialRole: ManagedUser['role'] = isPrimarySuperAdmin ? 'super_admin' : 'contributor';
    const initialStatus: ManagedUser['status'] = isPrimarySuperAdmin ? 'active' : 'pending';
    const newUser: ManagedUser = {
      id: safeId,
      username: emailPrefix.slice(0, 64),
      displayName: (params.displayName?.trim() || emailPrefix).slice(0, 120),
      email: cleanEmail.slice(0, 160),
      avatar: defaultAvatar.slice(0, 500),
      role: initialRole,
      status: initialStatus,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      permissions: { ...DEFAULT_PERMISSIONS[initialRole] },
    };

    try {
      await setDoc(userDocRef, buildFirestoreCreatePayload(newUser, safeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${MANAGED_USERS_COLLECTION}/${safeId}`);
    }

    const currentLocal = getAllUsers();
    const updatedLocal = [
      newUser,
      ...currentLocal.filter((u) => u.email.toLowerCase() !== cleanEmail && u.id !== safeId),
    ];
    saveAllUsers(updatedLocal);

    return {
      user: newUser,
      isSuspended: false,
      isPendingApproval: initialStatus === 'pending',
    };
  }

  // Fallback for local/session sync
  const currentUsers = getAllUsers();
  const existing = currentUsers.find((u) => u.email.trim().toLowerCase() === cleanEmail);
  if (existing) {
    return {
      user: existing,
      isSuspended: existing.status === 'suspended',
      isPendingApproval: existing.status === 'pending',
    };
  }

  const initialRole: ManagedUser['role'] = isPrimarySuperAdmin ? 'super_admin' : 'contributor';
  const initialStatus: ManagedUser['status'] = isPrimarySuperAdmin ? 'active' : 'pending';
  const fallbackUser: ManagedUser = {
    id: safeId,
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
  saveAllUsers([fallbackUser, ...currentUsers]);
  return {
    user: fallbackUser,
    isSuspended: false,
    isPendingApproval: initialStatus === 'pending',
  };
}

/**
 * Syncs admin status in `/admins/{uid}` when Super Admin promotes/demotes a user
 */
async function syncAdminGrantInFirestore(user: ManagedUser): Promise<void> {
  if (!auth.currentUser) return;
  const currentEmail = auth.currentUser.email?.trim().toLowerCase() || '';
  if (!PRIMARY_SUPER_ADMIN_EMAILS.includes(currentEmail)) return;

  const safeId = sanitizeDocId(user.id);
  const adminDocRef = doc(db, ADMINS_COLLECTION, safeId);

  try {
    const snap = await getDoc(adminDocRef);
    const shouldBeAdmin =
      user.status === 'active' && (user.role === 'admin' || user.role === 'super_admin');

    if (shouldBeAdmin && !snap.exists()) {
      await setDoc(adminDocRef, {
        uid: safeId,
        email: user.email.trim().toLowerCase().slice(0, 160),
        grantedBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
    } else if (!shouldBeAdmin && snap.exists()) {
      await deleteDoc(adminDocRef);
    }
  } catch (error) {
    console.warn('Could not sync admin grant doc:', error);
  }
}

export function createUser(user: Omit<ManagedUser, 'id' | 'createdAt'>): ManagedUser[] {
  const current = getAllUsers();
  const cleanEmail = user.email.trim().toLowerCase();
  const existingIdx = current.findIndex((u) => u.email.trim().toLowerCase() === cleanEmail);

  const safeId =
    existingIdx >= 0
      ? sanitizeDocId(current[existingIdx].id)
      : sanitizeDocId(`user_${Date.now()}`);

  const newUser: ManagedUser = {
    ...user,
    email: cleanEmail,
    id: safeId,
    emailVerified: true,
    createdAt: existingIdx >= 0 ? current[existingIdx].createdAt : new Date().toISOString(),
  };

  const updated =
    existingIdx >= 0
      ? current.map((u, idx) => (idx === existingIdx ? newUser : u))
      : [newUser, ...current];

  saveAllUsers(updated);

  if (auth.currentUser) {
    const userDocRef = doc(db, MANAGED_USERS_COLLECTION, safeId);
    const creatorUid = auth.currentUser.uid;
    getDoc(userDocRef)
      .then(async (snap) => {
        if (snap.exists()) {
          await updateDoc(userDocRef, {
            username: newUser.username.trim().slice(0, 64),
            displayName: newUser.displayName.trim().slice(0, 120),
            email: newUser.email.trim().toLowerCase().slice(0, 160),
            avatar: newUser.avatar.trim().slice(0, 500),
            role: newUser.role,
            status: newUser.status,
            emailVerified: true,
            canPublishArticles: Boolean(newUser.permissions.canPublishArticles),
            canEditArticles: Boolean(newUser.permissions.canEditArticles),
            canDeleteArticles: Boolean(newUser.permissions.canDeleteArticles),
            canManageCategories: Boolean(newUser.permissions.canManageCategories),
            canManageSettings: Boolean(newUser.permissions.canManageSettings),
            canManageUsers: Boolean(newUser.permissions.canManageUsers),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(userDocRef, buildFirestoreCreatePayload(newUser, creatorUid));
        }
        await syncAdminGrantInFirestore(newUser);
      })
      .catch((error) => {
        handleFirestoreError(error, OperationType.WRITE, `${MANAGED_USERS_COLLECTION}/${safeId}`);
      });
  }

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

  if (updatedTarget && auth.currentUser) {
    const target = updatedTarget as ManagedUser;
    const safeId = sanitizeDocId(target.id);
    const userDocRef = doc(db, MANAGED_USERS_COLLECTION, safeId);

    updateDoc(userDocRef, {
      username: target.username.trim().slice(0, 64),
      displayName: target.displayName.trim().slice(0, 120),
      email: target.email.trim().toLowerCase().slice(0, 160),
      avatar: target.avatar.trim().slice(0, 500),
      role: target.role,
      status: target.status,
      emailVerified: Boolean(target.emailVerified ?? true),
      canPublishArticles: Boolean(target.permissions.canPublishArticles),
      canEditArticles: Boolean(target.permissions.canEditArticles),
      canDeleteArticles: Boolean(target.permissions.canDeleteArticles),
      canManageCategories: Boolean(target.permissions.canManageCategories),
      canManageSettings: Boolean(target.permissions.canManageSettings),
      canManageUsers: Boolean(target.permissions.canManageUsers),
      updatedAt: serverTimestamp(),
    })
      .then(() => syncAdminGrantInFirestore(target))
      .catch((error) => {
        handleFirestoreError(error, OperationType.UPDATE, `${MANAGED_USERS_COLLECTION}/${safeId}`);
      });
  }

  return updated;
}

export function deleteUser(id: string): ManagedUser[] {
  const current = getAllUsers();
  const updated = current.filter((u) => u.id !== id);
  saveAllUsers(updated);

  if (auth.currentUser) {
    const safeId = sanitizeDocId(id);
    deleteDoc(doc(db, MANAGED_USERS_COLLECTION, safeId)).catch((error) => {
      handleFirestoreError(error, OperationType.DELETE, `${MANAGED_USERS_COLLECTION}/${safeId}`);
    });
  }

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

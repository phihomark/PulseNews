import { ManagedUser, UserPermissions } from '../types';

const USERS_STORAGE_KEY = 'tintuc_managed_users_v1';

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

export const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'user-1',
    username: 'admin',
    displayName: 'Admin Master',
    email: 'admin@pulsenews.io',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    role: 'super_admin',
    status: 'active',
    createdAt: '2026-01-10T08:00:00Z',
    permissions: { ...DEFAULT_PERMISSIONS.super_admin },
  },
  {
    id: 'user-2',
    username: 'sconnor',
    displayName: 'Sarah Connor',
    email: 'sarah.connor@pulsenews.io',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    role: 'editor',
    status: 'active',
    createdAt: '2026-02-14T10:30:00Z',
    permissions: { ...DEFAULT_PERMISSIONS.editor },
  },
  {
    id: 'user-3',
    username: 'mvance',
    displayName: 'Michael Vance',
    email: 'michael.vance@pulsenews.io',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    role: 'author',
    status: 'active',
    createdAt: '2026-03-01T14:15:00Z',
    permissions: { ...DEFAULT_PERMISSIONS.author },
  },
  {
    id: 'user-4',
    username: 'erostova',
    displayName: 'Elena Rostova',
    email: 'elena.rostova@pulsenews.io',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    role: 'contributor',
    status: 'active',
    createdAt: '2026-03-18T11:45:00Z',
    permissions: { ...DEFAULT_PERMISSIONS.contributor },
  },
];

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
  return INITIAL_USERS;
}

export function saveAllUsers(users: ManagedUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving managed users to localStorage:', err);
  }
}

export function createUser(user: Omit<ManagedUser, 'id' | 'createdAt'>): ManagedUser[] {
  const current = getAllUsers();
  const newUser: ManagedUser = {
    ...user,
    id: `user-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newUser, ...current];
  saveAllUsers(updated);
  return updated;
}

export function updateUser(id: string, updates: Partial<ManagedUser>): ManagedUser[] {
  const current = getAllUsers();
  const updated = current.map(u => u.id === id ? { ...u, ...updates } : u);
  saveAllUsers(updated);
  return updated;
}

export function deleteUser(id: string): ManagedUser[] {
  const current = getAllUsers();
  const updated = current.filter(u => u.id !== id);
  saveAllUsers(updated);
  return updated;
}

export function togglePermission(userId: string, permKey: keyof UserPermissions): ManagedUser[] {
  const current = getAllUsers();
  const updated = current.map(u => {
    if (u.id === userId) {
      return {
        ...u,
        permissions: {
          ...u.permissions,
          [permKey]: !u.permissions[permKey],
        },
      };
    }
    return u;
  });
  saveAllUsers(updated);
  return updated;
}

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  ShieldCheck, 
  LogOut, 
  Trash2, 
  Search, 
  Star, 
  ExternalLink,
  Cloud,
  Edit3,
  Edit2,
  Eye,
  Settings,
  Save,
  CheckCircle2,
  Home,
  Globe,
  FolderTree,
  FolderPlus,
  Users,
  UserPlus,
  Shield,
  UserCheck,
  UserX,
  Sliders,
  Check,
  Lock,
  X
} from 'lucide-react';
import { Article, AdminUser, ManagedUser, UserPermissions } from '../types';
import { EditArticleModal } from './EditArticleModal';
import { getAllCategories, addCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { getSiteSettings, saveSiteSettings, SiteSettings } from '../services/siteSettingsService';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  togglePermission, 
  DEFAULT_PERMISSIONS 
} from '../services/userService';

interface AdminDashboardProps {
  user: AdminUser;
  articles: Article[];
  onLogout: () => void;
  onDeleteArticle: (articleId: string) => void;
  onUpdateArticle: (article: Article) => void;
  onToggleArticleStatus: (articleId: string) => void;
  onToggleFeatured: (articleId: string) => void;
  onDeleteComment?: (articleId: string, commentId: string) => void;
  onOpenPublish: () => void;
  onOpenSecurity: () => void;
  onOpenCloudConfig: () => void;
  onViewArticle: (article: Article) => void;
  onGoHome?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  articles,
  onLogout,
  onDeleteArticle,
  onUpdateArticle,
  onToggleArticleStatus,
  onToggleFeatured,
  onOpenPublish,
  onOpenSecurity,
  onOpenCloudConfig,
  onViewArticle,
  onGoHome
}) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'categories' | 'users' | 'settings'>('articles');
  const [siteSettingsForm, setSiteSettingsForm] = useState<SiteSettings>(() => getSiteSettings());
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // User Management State
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>(() => getAllUsers());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingManagedUser, setEditingManagedUser] = useState<ManagedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [userSuccessMsg, setUserSuccessMsg] = useState('');

  const [userForm, setUserForm] = useState<{
    displayName: string;
    username: string;
    email: string;
    role: ManagedUser['role'];
    status: 'active' | 'suspended';
    avatar: string;
    permissions: UserPermissions;
  }>({
    displayName: '',
    username: '',
    email: '',
    role: 'editor',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    permissions: { ...DEFAULT_PERMISSIONS.editor }
  });

  const handleOpenAddUser = () => {
    setUserForm({
      displayName: '',
      username: '',
      email: '',
      role: 'editor',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      permissions: { ...DEFAULT_PERMISSIONS.editor }
    });
    setEditingManagedUser(null);
    setIsAddUserModalOpen(true);
  };

  const handleOpenEditUser = (u: ManagedUser) => {
    setEditingManagedUser(u);
    setUserForm({
      displayName: u.displayName,
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      avatar: u.avatar,
      permissions: { ...u.permissions }
    });
    setIsAddUserModalOpen(true);
  };

  const handleSaveUserForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.displayName.trim() || !userForm.email.trim()) return;

    if (editingManagedUser) {
      const updated = updateUser(editingManagedUser.id, userForm);
      setManagedUsers(updated);
      setUserSuccessMsg(`Cập nhật thông tin user "${userForm.displayName}" thành công!`);
    } else {
      const updated = createUser(userForm);
      setManagedUsers(updated);
      setUserSuccessMsg(`Thêm người dùng mới "${userForm.displayName}" thành công!`);
    }

    setIsAddUserModalOpen(false);
    setEditingManagedUser(null);
    setTimeout(() => setUserSuccessMsg(''), 3000);
  };

  const handleToggleUserPermission = (userId: string, permKey: keyof UserPermissions) => {
    const updated = togglePermission(userId, permKey);
    setManagedUsers(updated);
    setUserSuccessMsg(`Đã cập nhật quyền riêng cho user thành công!`);
    setTimeout(() => setUserSuccessMsg(''), 2500);
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    const deletedName = userToDelete.displayName;
    const updated = deleteUser(userToDelete.id);
    setManagedUsers(updated);
    setUserToDelete(null);
    setUserSuccessMsg(`Đã xóa tài khoản user "${deletedName}" thành công.`);
    setTimeout(() => setUserSuccessMsg(''), 3000);
  };

  // Category Management states
  const [categoriesList, setCategoriesList] = useState<string[]>(() => getAllCategories(articles));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCatOldName, setEditingCatOldName] = useState<string | null>(null);
  const [editingCatNewName, setEditingCatNewName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categorySuccessMsg, setCategorySuccessMsg] = useState('');

  // Category CRUD Handlers
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const updated = addCategory(trimmed);
    setCategoriesList(updated);
    setNewCategoryName('');
    setCategorySuccessMsg(`Category "${trimmed}" created successfully!`);
    setTimeout(() => setCategorySuccessMsg(''), 3000);
  };

  const handleSaveRenameCategory = (oldName: string) => {
    const trimmedNew = editingCatNewName.trim();
    if (!trimmedNew || trimmedNew === oldName) {
      setEditingCatOldName(null);
      return;
    }

    const updated = updateCategory(oldName, trimmedNew);
    
    // Batch update existing articles under old category name
    articles.forEach(art => {
      if (art.category === oldName) {
        onUpdateArticle({
          ...art,
          category: trimmedNew
        });
      }
    });

    setCategoriesList(updated);
    setEditingCatOldName(null);
    setEditingCatNewName('');
    setCategorySuccessMsg(`Renamed category "${oldName}" to "${trimmedNew}" successfully!`);
    setTimeout(() => setCategorySuccessMsg(''), 3000);
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const deletedName = categoryToDelete;
    const updated = deleteCategory(deletedName);

    // Reassign affected articles to 'Technology' or first available category
    const fallbackCategory = updated[0] || 'Technology';
    articles.forEach(art => {
      if (art.category === deletedName) {
        onUpdateArticle({
          ...art,
          category: fallbackCategory
        });
      }
    });

    setCategoriesList(updated);
    setCategoryToDelete(null);
    setCategorySuccessMsg(`Deleted category "${deletedName}". Affected stories moved to "${fallbackCategory}".`);
    setTimeout(() => setCategorySuccessMsg(''), 3000);
  };
  
  // Edit & Delete modal states
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

  // Metrics calculations
  const totalArticles = articles.length;
  const publishedCount = articles.filter(a => a.status !== 'draft').length;
  const draftCount = articles.filter(a => a.status === 'draft').length;
  const totalViews = articles.reduce((acc, curr) => acc + curr.views, 0);

  // Filtered articles list
  const filteredArticles = articles.filter(art => {
    if (selectedCategory !== 'All' && art.category !== selectedCategory) return false;
    if (statusFilter === 'published' && art.status === 'draft') return false;
    if (statusFilter === 'draft' && art.status !== 'draft') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return art.title.toLowerCase().includes(q) || art.author.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col md:flex-row">
      {/* WordPress Style Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 p-4 flex flex-col justify-between">
        <div>
          {/* Logo & Admin Branding */}
          <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h1 className="font-extrabold text-base text-white tracking-tight leading-tight">
                WP-CMS Admin
              </h1>
              <p className="text-[10px] text-indigo-400 font-mono">PulseNews Control</p>
            </div>
          </div>

          {/* Navigation Links - STRICT LEFT ALIGNMENT */}
          <nav className="space-y-1 text-xs font-semibold">
            {/* TOP ACTION: New Post (AI Powered) */}
            <button
              onClick={onOpenPublish}
              className="w-full flex items-center justify-start text-left gap-2.5 px-3.5 py-2.5 rounded-xl text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 font-bold shadow-md shadow-emerald-950/40 transition mb-2.5 border border-emerald-500/30"
              title="Create & Publish New Post"
            >
              <PlusCircle className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="text-left flex-1 min-w-0">+ New Post (Viết bài mới)</span>
            </button>

            {/* Quick Home Navigation Button */}
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="w-full flex items-center justify-start text-left gap-2.5 px-3.5 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 hover:bg-indigo-900 hover:text-white text-xs font-bold transition mb-3 group shadow-sm"
                title="Quay về Trang Chủ / Visit Public Site"
              >
                <Home className="w-4 h-4 text-cyan-400 group-hover:text-white shrink-0" />
                <span className="text-left flex-1 min-w-0">← Visit Home (Trang Chủ)</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('articles')}
              className={`w-full flex items-center justify-start text-left gap-2.5 px-3.5 py-2.5 rounded-xl transition ${
                activeTab === 'articles' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="text-left flex-1 min-w-0">All Articles ({totalArticles})</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center justify-start text-left gap-2.5 px-3.5 py-2.5 rounded-xl transition ${
                activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FolderTree className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-left flex-1 min-w-0">Categories ({categoriesList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-start text-left gap-2.5 px-3.5 py-2.5 rounded-xl transition ${
                activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-left flex-1 min-w-0">Quản lý User ({managedUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-start text-left gap-2.5 px-3.5 py-2.5 rounded-xl transition ${
                activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-left flex-1 min-w-0">General Settings</span>
            </button>


            <button
              onClick={onOpenSecurity}
              className="w-full flex items-center justify-start text-left gap-2.5 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-left flex-1 min-w-0">WAF Security Shield</span>
            </button>

            <button
              onClick={onOpenCloudConfig}
              className="w-full flex items-center justify-start text-left gap-2.5 px-3.5 py-2.5 rounded-xl text-cyan-300 hover:bg-slate-800 transition"
            >
              <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-left flex-1 min-w-0">Vercel & Supabase SQL</span>
            </button>
          </nav>
        </div>

        {/* User Account & Logout */}
        <div className="pt-6 border-t border-slate-800 mt-6">
          <div className="flex items-center gap-3 mb-3 text-left">
            <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-indigo-500 shrink-0" />
            <div className="overflow-hidden text-left">
              <div className="font-bold text-xs text-white truncate">{user.displayName}</div>
              <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-start text-left gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-300 text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Dashboard Content */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>CMS Article Manager</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                WordPress Style
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage, edit, publish, or trash articles with real-time Supabase Cloud DB sync
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                title="Quay về Trang Chủ Public Site"
              >
                <Home className="w-4 h-4 text-indigo-500" />
                <span>Trang Chủ (Home)</span>
              </button>
            )}

            <button
              onClick={onOpenPublish}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add New Post</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Total Articles</div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{totalArticles}</div>
            <div className="text-[10px] text-emerald-500 font-medium mt-1">Published: {publishedCount} | Drafts: {draftCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Total Pageviews</div>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">{totalViews.toLocaleString('en-US')}</div>
            <div className="text-[10px] text-slate-400 mt-1">Across all stories</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">WAF Shield Status</div>
            <div className="text-2xl font-extrabold text-emerald-500 font-mono">100%</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Anti-DDoS Active</div>
          </div>
        </div>

        {/* Tab 1: Articles Management */}
        {activeTab === 'articles' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* WordPress Style Filter Links (All | Published | Drafts) */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`${statusFilter === 'all' ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-4' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  All <span className="text-[11px] font-mono text-slate-400">({totalArticles})</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={() => setStatusFilter('published')}
                  className={`${statusFilter === 'published' ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-4' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  Published <span className="text-[11px] font-mono text-slate-400">({publishedCount})</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={() => setStatusFilter('draft')}
                  className={`${statusFilter === 'draft' ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-4' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  Drafts <span className="text-[11px] font-mono text-slate-400">({draftCount})</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 outline-none"
                >
                  <option value="All">All Categories</option>
                  {getAllCategories(articles).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter articles by title or author..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* WordPress Style Articles Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">Title</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Author</th>
                    <th className="p-3.5">Views</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions (Edit | Trash | View)</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredArticles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        No articles match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredArticles.map(art => (
                      <tr key={art.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        {/* Title & Cover & WordPress Quick Links (Edit | Trash | View) */}
                        <td className="p-3.5">
                          <div className="flex items-start gap-3 max-w-md">
                            <img src={art.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 mt-0.5" />
                            <div>
                              <div 
                                onClick={() => onViewArticle(art)}
                                className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-1"
                              >
                                {art.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Published: {new Date(art.publishedAt).toLocaleDateString('en-US')}
                              </div>

                              {/* WordPress Classic Quick Action Links */}
                              <div className="flex items-center gap-2 text-[11px] font-semibold mt-1.5 opacity-90 group-hover:opacity-100 transition">
                                <button
                                  onClick={() => setEditingArticle(art)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <button
                                  onClick={() => setArticleToDelete(art)}
                                  className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Trash</span>
                                </button>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <button
                                  onClick={() => onViewArticle(art)}
                                  className="text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-0.5"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-3.5 font-medium">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                            {art.category}
                          </span>
                        </td>

                        {/* Author */}
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                          {art.author.name}
                        </td>

                        {/* Views */}
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {art.views.toLocaleString('en-US')}
                        </td>

                        {/* Status Badges */}
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <button
                              onClick={() => onToggleArticleStatus(art.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                art.status === 'draft'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {art.status === 'draft' ? 'Draft' : 'Published'}
                            </button>

                            {art.isFeatured && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Featured
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Dedicated Action Buttons (Edit | Trash | View) */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => setEditingArticle(art)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-600 hover:text-white text-xs font-bold flex items-center gap-1 transition"
                              title="Edit Article"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>

                            {/* Trash Button */}
                            <button
                              onClick={() => setArticleToDelete(art)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80 hover:bg-rose-600 hover:text-white text-xs font-bold flex items-center gap-1 transition"
                              title="Move to Trash / Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Trash</span>
                            </button>

                            {/* View Button */}
                            <button
                              onClick={() => onViewArticle(art)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1 transition"
                              title="View Public Story"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">View</span>
                            </button>

                            {/* Star / Featured Toggle */}
                            <button
                              onClick={() => onToggleFeatured(art.id)}
                              className={`p-1.5 rounded-lg transition ${
                                art.isFeatured ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500'
                              }`}
                              title="Toggle Featured Main Story"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Category Management (Thêm / Xóa / Sửa Chuyên Mục) */}
        {activeTab === 'categories' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm max-w-4xl">
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Category Manager (Quản lý Chuyên mục)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add new categories, edit category names or delete categories across all published stories</p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                Total Categories: {categoriesList.length}
              </span>
            </div>

            {categorySuccessMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                <span>{categorySuccessMsg}</span>
              </div>
            )}

            {/* Add New Category Form */}
            <form onSubmit={handleAddNewCategory} className="mb-8 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                + Add New Category (Thêm Chuyên mục mới)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Artificial Intelligence, Science, Health & Lifestyle..."
                  className="flex-1 w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-medium"
                />

                <button
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>+ Add Category</span>
                </button>
              </div>
            </form>

            {/* Categories Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">Category Name</th>
                    <th className="p-3.5">Articles Count</th>
                    <th className="p-3.5 text-right">Actions (Edit / Rename | Delete)</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {categoriesList.map((catName) => {
                    const articleCount = articles.filter(a => a.category === catName).length;
                    const isEditing = editingCatOldName === catName;

                    return (
                      <tr key={catName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        {/* Category Name Column */}
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {isEditing ? (
                            <div className="flex items-center gap-2 max-w-sm">
                              <input
                                type="text"
                                value={editingCatNewName}
                                onChange={(e) => setEditingCatNewName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveRenameCategory(catName);
                                  } else if (e.key === 'Escape') {
                                    setEditingCatOldName(null);
                                  }
                                }}
                                autoFocus
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-indigo-500 text-xs font-semibold text-slate-900 dark:text-white outline-none w-full"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              <span>{catName}</span>
                            </div>
                          )}
                        </td>

                        {/* Articles Count Column */}
                        <td className="p-3.5 font-medium">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {articleCount} {articleCount === 1 ? 'story' : 'stories'}
                          </span>
                        </td>

                        {/* Actions Column */}
                        <td className="p-3.5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveRenameCategory(catName)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCatOldName(null)}
                                className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {/* Edit / Rename Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCatOldName(catName);
                                  setEditingCatNewName(catName);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-600 hover:text-white text-xs font-bold transition flex items-center gap-1"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Rename</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => setCategoryToDelete(catName)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80 hover:bg-rose-600 hover:text-white text-xs font-bold transition flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: User Management & Granular Permissions */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm max-w-6xl">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Quản lý User & Phân quyền riêng
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Thêm, xóa, sửa thông tin người dùng và cấp quyền tùy chỉnh chi tiết cho từng tài khoản
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddUser}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Thêm User mới</span>
              </button>
            </div>

            {userSuccessMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                <span>{userSuccessMsg}</span>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, username hoặc email..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
                <span className="text-slate-500 font-semibold shrink-0">Lọc Vai Trò:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none w-full sm:w-auto"
                >
                  <option value="all">Tất cả Vai trò</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor (Biên tập viên)</option>
                  <option value="author">Author (Tác giả)</option>
                  <option value="contributor">Contributor (Cộng tác viên)</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">Thành viên</th>
                    <th className="p-3.5">Vai trò</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5">Quyền hạn riêng (Nhấp để bật/tắt)</th>
                    <th className="p-3.5 text-right">Thao tác (Sửa | Xóa)</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {managedUsers
                    .filter(u => {
                      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
                      if (userSearchQuery.trim()) {
                        const q = userSearchQuery.toLowerCase();
                        return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map((u) => {
                      const roleColors: Record<string, string> = {
                        super_admin: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
                        admin: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
                        editor: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                        author: 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
                        contributor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                      };

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          {/* User Avatar & Info */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{u.displayName}</span>
                                  <span className="text-[10px] font-mono text-slate-400">(@{u.username})</span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${roleColors[u.role] || roleColors.contributor}`}>
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = updateUser(u.id, { status: u.status === 'active' ? 'suspended' : 'active' });
                                setManagedUsers(updated);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                u.status === 'active'
                                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-rose-50 hover:text-rose-600'
                                  : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-emerald-50 hover:text-emerald-600'
                              }`}
                              title="Nhấp để thay đổi Trạng Thái"
                            >
                              {u.status === 'active' ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Khóa (Suspended)</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Granular Custom Permissions */}
                          <td className="p-3.5 max-w-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(
                                [
                                  { key: 'canPublishArticles', label: 'Đăng bài' },
                                  { key: 'canEditArticles', label: 'Sửa bài' },
                                  { key: 'canDeleteArticles', label: 'Xóa bài' },
                                  { key: 'canManageCategories', label: 'Chuyên mục' },
                                  { key: 'canManageSettings', label: 'Cài đặt/Ads' },
                                  { key: 'canManageUsers', label: 'Quản lý User' },
                                ] as const
                              ).map(p => {
                                const isGranted = Boolean(u.permissions[p.key]);
                                return (
                                  <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => handleToggleUserPermission(u.id, p.key)}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition flex items-center gap-0.5 border ${
                                      isGranted
                                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200 opacity-60'
                                    }`}
                                    title={`Nhấp để ${isGranted ? 'Tắt' : 'Bật'} quyền ${p.label}`}
                                  >
                                    {isGranted ? <Check className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" /> : <X className="w-2.5 h-2.5 text-slate-400" />}
                                    <span>{p.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white text-xs font-bold transition flex items-center gap-1"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Sửa</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-600 hover:text-white text-xs font-bold transition flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: General Settings */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm max-w-3xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">General Settings</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Customize Website Title, Subtitle, Logo Icon and Footer Copyright details</p>
              </div>
            </div>

            {saveSettingsSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                <span>General site settings updated successfully across the system!</span>
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              saveSiteSettings(siteSettingsForm);
              setSaveSettingsSuccess(true);
              setTimeout(() => setSaveSettingsSuccess(false), 3000);
            }} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Website Title *
                </label>
                <input
                  type="text"
                  value={siteSettingsForm.siteTitle}
                  onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, siteTitle: e.target.value }))}
                  required
                  placeholder="e.g. PulseNews"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={siteSettingsForm.siteTagline}
                  onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, siteTagline: e.target.value }))}
                  placeholder="e.g. Ultra-Fast Minimalist News & Security Shield"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={siteSettingsForm.contactEmail}
                    onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="admin@domain.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Logo Icon Style
                  </label>
                  <select
                    value={siteSettingsForm.siteLogoIcon}
                    onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, siteLogoIcon: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    <option value="Zap">⚡ Lightning Bolt (Zap)</option>
                    <option value="Flame">🔥 Trending Flame</option>
                    <option value="Newspaper">📰 Newspaper Press</option>
                    <option value="ShieldCheck">🛡️ WAF Security Shield</option>
                    <option value="Globe">🌐 Global Portal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Footer Copyright Text
                </label>
                <input
                  type="text"
                  value={siteSettingsForm.footerCopyright}
                  onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, footerCopyright: e.target.value }))}
                  placeholder="© 2026 PulseNews Press. All rights reserved."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Mã theo dõi & Quảng cáo (Tracking & Ads) Card inside Settings */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">Mã theo dõi & Quảng cáo (Tracking & Ads)</h4>
                </div>

                {/* Google Ads */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <span>📢</span>
                    <span>Google Ads Client ID</span>
                  </div>
                  <input
                    type="text"
                    value={siteSettingsForm.googleAdsClientId}
                    onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, googleAdsClientId: e.target.value }))}
                    placeholder="ca-pub-3026550437424167"
                    className="w-full px-3.5 py-2 text-xs font-mono bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 italic">Ví dụ: ca-pub-1234567890123456</p>
                </div>

                {/* Google Analytics */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <span>📈</span>
                    <span>Google Analytics IDs (mỗi dòng một ID)</span>
                  </div>
                  <textarea
                    value={siteSettingsForm.googleAnalyticsIds}
                    onChange={(e) => setSiteSettingsForm(prev => ({ ...prev, googleAnalyticsIds: e.target.value }))}
                    placeholder="G-QKS1ZF0QYS"
                    rows={3}
                    className="w-full p-3 text-xs font-mono bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/30 flex items-center gap-1.5 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Save General Settings</span>
                </button>
              </div>
            </form>
          </div>
        )}


      </main>

      {/* Edit Article Modal */}
      <EditArticleModal
        isOpen={Boolean(editingArticle)}
        article={editingArticle}
        onClose={() => setEditingArticle(null)}
        onSaveSuccess={(updated) => {
          onUpdateArticle(updated);
          setEditingArticle(null);
        }}
        onDeleteArticle={(id) => {
          onDeleteArticle(id);
          setEditingArticle(null);
        }}
      />

      {/* Move to Drafts Confirmation Modal */}
      {articleToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-500 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Move to Drafts</h3>
                <p className="text-[11px] text-slate-400">Hide story from public reader view</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Are you sure you want to move <strong className="text-slate-900 dark:text-white">"{articleToDelete.title}"</strong> to Drafts? It will be hidden from the homepage and moved to your Drafts tab where you can restore or edit it anytime.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setArticleToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteArticle(articleToDelete.id);
                  setArticleToDelete(null);
                }}
                className="px-4.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Drafts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete Category (Xóa Chuyên mục)</h3>
                <p className="text-[11px] text-slate-400">Permanently remove category from system</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Are you sure you want to delete category <strong className="text-slate-900 dark:text-white">"{categoryToDelete}"</strong>?
              {articles.filter(a => a.category === categoryToDelete).length > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️ Note: {articles.filter(a => a.category === categoryToDelete).length} article(s) currently belong to this category and will be reassigned.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/20 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Category</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-xl w-full shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {editingManagedUser ? 'Chỉnh sửa thông tin User' : 'Thêm thành viên mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Thiết lập tài khoản và cấp quyền riêng chi tiết</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setIsAddUserModalOpen(false); setEditingManagedUser(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên hiển thị (Full Name) *
                  </label>
                  <input
                    type="text"
                    value={userForm.displayName}
                    onChange={(e) => setUserForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="e.g. Nguyễn Văn A"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="e.g. nguyenvana"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@domain.com"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vai trò (Role)
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value as ManagedUser['role'];
                      setUserForm(prev => ({
                        ...prev,
                        role: newRole,
                        permissions: { ...DEFAULT_PERMISSIONS[newRole] }
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    <option value="super_admin">Super Admin (Quyền cao nhất)</option>
                    <option value="admin">Admin (Quản trị viên)</option>
                    <option value="editor">Editor (Biên tập viên)</option>
                    <option value="author">Author (Tác giả)</option>
                    <option value="contributor">Contributor (Cộng tác viên)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={userForm.avatar}
                  onChange={(e) => setUserForm(prev => ({ ...prev, avatar: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Granular Permission Checkboxes */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  <span>Cấp quyền riêng chi tiết (Granular Custom Permissions)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {(
                    [
                      { key: 'canPublishArticles', label: 'Đăng bài viết mới' },
                      { key: 'canEditArticles', label: 'Chỉnh sửa bài viết' },
                      { key: 'canDeleteArticles', label: 'Xóa / Chuyển Draft' },
                      { key: 'canManageCategories', label: 'Quản lý Chuyên mục' },
                      { key: 'canManageSettings', label: 'Cài đặt & Mã Tracking' },
                      { key: 'canManageUsers', label: 'Quản lý & Phân quyền User' },
                    ] as const
                  ).map(p => (
                    <label key={p.key} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-500 transition">
                      <input
                        type="checkbox"
                        checked={Boolean(userForm.permissions[p.key])}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUserForm(prev => ({
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              [p.key]: checked
                            }
                          }));
                        }}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsAddUserModalOpen(false); setEditingManagedUser(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingManagedUser ? 'Lưu thay đổi' : 'Tạo người dùng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Xóa tài khoản người dùng</h3>
                <p className="text-[11px] text-slate-400">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Bạn có chắc chắn muốn xóa tài khoản của thành viên <strong className="text-slate-900 dark:text-white">"{userToDelete.displayName}" (@{userToDelete.username})</strong> khỏi hệ thống?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/20 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa người dùng</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Moon, 
  Sun, 
  Search, 
  PlusCircle, 
  FileCode,
  Flame,
  Bookmark,
  Cloud,
  UserCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ArticleCategory, AdminUser } from '../types';
import { getAllCategories } from '../services/categoryService';

import { getSiteSettings, SiteSettings } from '../services/siteSettingsService';

interface HeaderProps {
  activeCategory: ArticleCategory;
  onSelectCategory: (cat: ArticleCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenPublish: () => void;
  onOpenSecurity: () => void;
  onOpenRobots: () => void;
  onOpenCloudConfig: () => void;
  onOpenAdmin: () => void;
  adminUser: AdminUser | null;
  onToggleBookmarksOnly: () => void;
  showBookmarksOnly: boolean;
  bookmarkedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenPublish,
  onOpenSecurity,
  onOpenRobots,
  onOpenCloudConfig,
  onOpenAdmin,
  adminUser,
  onToggleBookmarksOnly,
  showBookmarksOnly,
  bookmarkedCount
}) => {
  const { theme, setTheme, isDark } = useTheme();
  const [categoriesList, setCategoriesList] = useState<string[]>(() => ['All', ...getAllCategories()]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => getSiteSettings());

  useEffect(() => {
    const handleCategoriesUpdated = () => {
      setCategoriesList(['All', ...getAllCategories()]);
    };
    const handleSettingsUpdated = () => {
      setSiteSettings(getSiteSettings());
    };

    window.addEventListener('categories_updated', handleCategoriesUpdated);
    window.addEventListener('site_settings_updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('categories_updated', handleCategoriesUpdated);
      window.removeEventListener('site_settings_updated', handleSettingsUpdated);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      {/* Top Banner Notice - ONLY visible to logged-in Admin */}
      {adminUser && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-slate-200 text-xs py-1.5 px-4 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
              SHIELD ACTIVE
            </span>
            <span className="text-slate-300 hidden sm:inline">
              WAF Firewall Blocking 8 AI Scraper Bots | Rate Limit 100 req/min
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenCloudConfig}
              className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 transition text-[11px] font-semibold"
              title="Vercel Deployment & Cloud DB Guide"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Vercel & Cloud DB</span>
            </button>

            <button
              onClick={onOpenRobots}
              className="flex items-center gap-1 hover:text-indigo-300 transition text-[11px] underline underline-offset-2 hidden sm:flex"
              title="Inspect security robots.txt"
            >
              <FileCode className="w-3 h-3" />
              <span>robots.txt</span>
            </button>
            
            <button
              onClick={onOpenSecurity}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition text-[11px]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>WAF Shield</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <a href="/" onClick={(e) => { e.preventDefault(); onSelectCategory('All'); }} className="flex items-center gap-2 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition duration-200">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                  {siteSettings.siteTitle}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  CMS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                {siteSettings.siteTagline}
              </p>
            </div>
          </a>

          {/* Center Search Input */}
          <div className="flex-1 max-w-md mx-2 sm:mx-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search news, tech, security..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-full border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition duration-150"
              />
              {searchQuery && (
                <button 
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Admin CMS Badge - ONLY shown when logged in */}
            {adminUser && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 transition"
                title={`Logged in Admin: ${adminUser.displayName}`}
              >
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Admin CMS</span>
              </button>
            )}

            {/* Bookmarks Toggle */}
            <button
              onClick={onToggleBookmarksOnly}
              className={`relative p-2 rounded-xl transition ${
                showBookmarksOnly 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title="Saved Stories"
            >
              <Bookmark className="w-5 h-5" />
              {bookmarkedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {bookmarkedCount}
                </span>
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>

            {/* Publish Article Button - ONLY shown when logged in as Admin */}
            {adminUser && (
              <button
                onClick={onOpenPublish}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-sm shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Publish</span>
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Category Scroll Bar */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {categoriesList.map((cat) => {
            const isActive = activeCategory === cat && !showBookmarksOnly;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {cat === 'All' && <Flame className="w-3 h-3 inline mr-1 text-amber-500" />}
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

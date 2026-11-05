import React from 'react';
import { Home, PlusCircle, ShieldCheck, Bookmark, Compass } from 'lucide-react';
import { ArticleCategory, AdminUser } from '../types';

interface BottomNavProps {
  activeCategory: ArticleCategory;
  onSelectCategory: (cat: ArticleCategory) => void;
  onOpenPublish: () => void;
  onOpenSecurity: () => void;
  onToggleBookmarksOnly: () => void;
  showBookmarksOnly: boolean;
  bookmarkedCount: number;
  adminUser: AdminUser | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeCategory,
  onSelectCategory,
  onOpenPublish,
  onOpenSecurity,
  onToggleBookmarksOnly,
  showBookmarksOnly,
  bookmarkedCount,
  adminUser
}) => {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around shadow-lg transition-colors">
      <button
        onClick={() => onSelectCategory('All')}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition ${
          activeCategory === 'All' && !showBookmarksOnly
            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Home</span>
      </button>

      <button
        onClick={() => onSelectCategory('Technology')}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition ${
          activeCategory === 'Technology' && !showBookmarksOnly
            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Compass className="w-5 h-5" />
        <span className="text-[10px]">Topics</span>
      </button>

      {/* Floating Center Create Post Button - ONLY shown when logged in */}
      {adminUser && (
        <button
          onClick={onOpenPublish}
          className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/40 active:scale-95 transition"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
      )}

      {/* Security Button - ONLY shown when logged in */}
      {adminUser && (
        <button
          onClick={onOpenSecurity}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition"
        >
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span className="text-[10px]">Security</span>
        </button>
      )}

      <button
        onClick={onToggleBookmarksOnly}
        className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition ${
          showBookmarksOnly
            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Bookmark className="w-5 h-5" />
        <span className="text-[10px]">Saved</span>
        {bookmarkedCount > 0 && (
          <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
            {bookmarkedCount}
          </span>
        )}
      </button>
    </div>
  );
};

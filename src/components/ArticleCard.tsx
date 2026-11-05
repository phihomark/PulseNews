import React from 'react';
import { Clock, Eye, Bookmark, MessageSquare, ArrowUpRight } from 'lucide-react';
import { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  onSelect: (article: Article) => void;
  onToggleBookmark: (e: React.MouseEvent, articleId: string) => void;
  isFeatured?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onSelect,
  onToggleBookmark,
  isFeatured = false
}) => {
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  if (isFeatured) {
    return (
      <div 
        onClick={() => onSelect(article)}
        className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 text-white shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          <div className="md:col-span-7 relative h-64 md:h-full min-h-[260px] overflow-hidden">
            <img
              src={article.coverUrl}
              alt={article.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent md:hidden" />
            
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-md">
                {article.category}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/90 text-white shadow-sm">
                Featured
              </span>
            </div>
          </div>

          <div className="md:col-span-5 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 text-xs text-slate-300 mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {formatTime(article.publishedAt)}
                </span>
                <span>•</span>
                <span>{article.readTimeMinutes} min read</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold leading-tight text-white group-hover:text-indigo-300 transition line-clamp-3 mb-3">
                {article.title}
              </h2>

              <p className="text-slate-300 text-sm line-clamp-3 leading-relaxed mb-4">
                {article.summary}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold text-white">
                  {article.author.name.charAt(0)}
                </div>
                <span className="text-xs font-medium text-slate-300">{article.author.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => onToggleBookmark(e, article.id)}
                  className={`p-2 rounded-lg transition ${
                    article.isBookmarked 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  }`}
                  title="Bookmark story"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1 text-xs text-indigo-400 font-semibold group-hover:translate-x-1 transition">
                  <span>Read Now</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article
      onClick={() => onSelect(article)}
      className="group cursor-pointer flex flex-col justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 p-4 shadow-sm hover:shadow-md transition duration-200"
    >
      <div>
        {/* Top image container */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 mb-3.5">
          <img
            src={article.coverUrl}
            alt={article.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900/80 backdrop-blur-md text-white">
              {article.category}
            </span>
          </div>

          <button
            onClick={(e) => onToggleBookmark(e, article.id)}
            className={`absolute top-2.5 right-2.5 p-1.5 rounded-md backdrop-blur-md transition ${
              article.isBookmarked 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-200'
            }`}
            title="Bookmark story"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-mono">
          <span>{formatTime(article.publishedAt)}</span>
          <span>•</span>
          <span>{article.readTimeMinutes}m read</span>
        </div>

        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-2 leading-snug mb-2">
          {article.title}
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {article.summary}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
          {article.author.name}
        </span>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-slate-400" />
            {article.views.toLocaleString('en-US')}
          </span>
        </div>
      </div>
    </article>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Eye, 
  Bookmark, 
  Share2, 
  QrCode, 
  Check, 
  ShieldCheck,
  Compass,
  ArrowUpRight,
  Zap,
  Home
} from 'lucide-react';
import { Article } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getSiteSettings } from '../services/siteSettingsService';
import { sanitizeHTML } from '../services/securityService';

interface ArticleReaderProps {
  article: Article;
  onBack: () => void;
  onToggleBookmark: (articleId: string) => void;
  relatedArticles: Article[];
  onSelectRelated: (art: Article) => void;
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({
  article,
  onBack,
  onToggleBookmark,
  relatedArticles,
  onSelectRelated
}) => {
  const { readerSettings, updateReaderSettings } = useTheme();
  const [scrollPercent, setScrollPercent] = useState(0);

  const siteSettings = getSiteSettings();

  // Share & QR state
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollPercent(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Font size styles mapping
  const fontSizeClasses = {
    sm: 'text-sm leading-relaxed',
    md: 'text-base sm:text-lg leading-relaxed',
    lg: 'text-lg sm:text-xl leading-relaxed',
    xl: 'text-xl sm:text-2xl leading-loose'
  }[readerSettings.fontSize];

  const fontStyleClass = readerSettings.fontStyle === 'serif' ? 'font-serif' : 'font-sans';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-600 z-50 transition-all duration-150"
        style={{ width: `${scrollPercent}%` }}
      />

      {/* Reader Sticky Header Bar with Logo and Menu Navigation */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-2.5 px-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Website Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 group cursor-pointer text-left shrink-0"
              title="Return Home - Trang Chủ"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div className="hidden xs:block sm:block">
                <div className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition tracking-tight">
                  {siteSettings.siteTitle}
                </div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                  <ArrowLeft className="w-2.5 h-2.5" />
                  <span>Home</span>
                </div>
              </div>
            </button>

            <span className="w-px h-5 bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            {/* Quick Home Nav Button */}
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
            >
              <Home className="w-3.5 h-3.5 text-indigo-500" />
              <span>Home</span>
            </button>
          </div>

          {/* Reader Controls Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Font Style Toggle */}
            <button
              onClick={() => updateReaderSettings({ fontStyle: readerSettings.fontStyle === 'sans' ? 'serif' : 'sans' })}
              className="px-2 py-1 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              title="Switch Serif / Sans-serif"
            >
              {readerSettings.fontStyle === 'sans' ? 'Serif' : 'Sans'}
            </button>

            {/* Font Size Adjusters */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => {
                  const sizes: ('sm' | 'md' | 'lg' | 'xl')[] = ['sm', 'md', 'lg', 'xl'];
                  const idx = sizes.indexOf(readerSettings.fontSize);
                  if (idx > 0) updateReaderSettings({ fontSize: sizes[idx - 1] });
                }}
                className="px-1.5 py-0.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 font-bold"
                title="Decrease font size"
              >
                A-
              </button>
              <span className="text-[10px] text-slate-400 uppercase font-mono px-1">
                {readerSettings.fontSize}
              </span>
              <button
                onClick={() => {
                  const sizes: ('sm' | 'md' | 'lg' | 'xl')[] = ['sm', 'md', 'lg', 'xl'];
                  const idx = sizes.indexOf(readerSettings.fontSize);
                  if (idx < sizes.length - 1) updateReaderSettings({ fontSize: sizes[idx + 1] });
                }}
                className="px-1.5 py-0.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 font-bold"
                title="Increase font size"
              >
                A+
              </button>
            </div>

            {/* QR Code Share for Mobile */}
            <button
              onClick={() => setShowQrModal(true)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Open Mobile QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Copy Share Link */}
            <button
              onClick={handleCopyShareLink}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
              title="Share Story"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Bookmark Button */}
            <button
              onClick={() => onToggleBookmark(article.id)}
              className={`p-1.5 rounded-lg transition ${
                article.isBookmarked ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Article Main Body Container */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Meta Badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {article.category}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(article.publishedAt).toLocaleDateString('en-US', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 ml-auto">
            <Eye className="w-3.5 h-3.5" />
            {article.views.toLocaleString('en-US')} views
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
          {article.title}
        </h1>

        {/* Author info */}
        <div className="flex items-center justify-between py-3 border-y border-slate-200 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow">
              {article.author.avatar ? (
                <img src={article.author.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                article.author.name.charAt(0)
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {article.author.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {article.author.role || 'Staff Writer'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>WAF Verified</span>
          </div>
        </div>

        {/* Excerpt Summary Box */}
        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-600 mb-6">
          <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-indigo-200 leading-relaxed italic">
            "{article.summary}"
          </p>
        </div>

        {/* Cover Image */}
        <div className="rounded-2xl overflow-hidden mb-8 shadow-md bg-slate-100/50 dark:bg-slate-900/50">
          <img
            src={article.coverUrl}
            alt={article.title}
            className="max-w-full h-auto max-h-[550px] object-contain mx-auto rounded-2xl"
          />
        </div>

        {/* Article Content (Supports HTML from Visual WYSIWYG Editor & Markdown) */}
        <article className={`prose dark:prose-invert max-w-none ${fontSizeClasses} ${fontStyleClass} text-slate-800 dark:text-slate-200 text-justify article-body`}>
          {/<[a-z][\s\S]*>/i.test(article.content || '') ? (
            <div className="text-justify [&_p]:text-justify [&_div]:text-justify [&_span]:text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHTML(article.content) }} />
          ) : (
            article.content ? (
              article.content.split(/\n\n+/).map((block, blockIndex) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                if (trimmed.startsWith('### ')) {
                  return (
                    <h3 key={blockIndex} className="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3">
                      {trimmed.replace('### ', '')}
                    </h3>
                  );
                }

                if (trimmed.startsWith('## ')) {
                  return (
                    <h2 key={blockIndex} className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
                      {trimmed.replace('## ', '')}
                    </h2>
                  );
                }

                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote key={blockIndex} className="border-l-4 border-indigo-500 pl-4 py-2 italic text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/60 rounded-r-lg my-4 text-justify">
                      {trimmed.replace('> ', '')}
                    </blockquote>
                  );
                }

                const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

                if (imgRegex.test(trimmed)) {
                  const imageMatches: { alt: string; src: string; index: number; length: number }[] = [];
                  let match: RegExpExecArray | null;
                  imgRegex.lastIndex = 0;

                  while ((match = imgRegex.exec(trimmed)) !== null) {
                    imageMatches.push({
                      alt: match[1],
                      src: match[2],
                      index: match.index,
                      length: match[0].length
                    });
                  }

                  const elements: React.ReactNode[] = [];
                  let currentIdx = 0;

                  imageMatches.forEach((img, i) => {
                    const beforeText = trimmed.slice(currentIdx, img.index).trim();
                    if (beforeText) {
                      beforeText.split('\n').forEach((line, lIdx) => {
                        const lineTrim = line.trim();
                        if (lineTrim) {
                          elements.push(
                            <p key={`text-${blockIndex}-${currentIdx}-${lIdx}`} className="leading-relaxed my-3 text-justify">
                              {lineTrim}
                            </p>
                          );
                        }
                      });
                    }

                    elements.push(
                      <figure key={`img-${blockIndex}-${i}`} className="my-6 text-center">
                        <img
                          src={img.src}
                          alt={img.alt || 'Article image'}
                          className="max-w-full h-auto mx-auto rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 object-contain"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.style.opacity = '0.7';
                          }}
                        />
                        {img.alt && (
                          <figcaption className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 italic">
                            {img.alt}
                          </figcaption>
                        )}
                      </figure>
                    );

                    currentIdx = img.index + img.length;
                  });

                  const afterText = trimmed.slice(currentIdx).trim();
                  if (afterText) {
                    afterText.split('\n').forEach((line, lIdx) => {
                      const lineTrim = line.trim();
                      if (lineTrim) {
                        elements.push(
                          <p key={`text-${blockIndex}-${currentIdx}-${lIdx}`} className="leading-relaxed my-3 text-justify">
                            {lineTrim}
                          </p>
                        );
                      }
                    });
                  }

                  return <React.Fragment key={blockIndex}>{elements}</React.Fragment>;
                }

                const lines = trimmed.split('\n');
                return (
                  <div key={blockIndex} className="space-y-3 my-3 text-justify">
                    {lines.map((line, lineIdx) => {
                      const lineTrim = line.trim();
                      if (!lineTrim) return null;
                      return (
                        <p key={lineIdx} className="leading-relaxed text-justify">
                          {lineTrim}
                        </p>
                      );
                    })}
                  </div>
                );
              })
            ) : null
          )}
        </article>

        {/* Tags */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 mb-12">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tags:</span>
          {article.tags.map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              #{tag}
            </span>
          ))}
        </div>

        {/* Prominent Related Articles Section */}
        {relatedArticles.length > 0 && (
          <section className="mt-12 pt-8 border-t-2 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-500" />
                <span>Related Stories in {article.category}</span>
              </h3>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {relatedArticles.length} articles
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedArticles.slice(0, 4).map(rel => (
                <div
                  key={rel.id}
                  onClick={() => onSelectRelated(rel)}
                  className="cursor-pointer group p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
                >
                  <div className="flex gap-3 mb-3">
                    <img src={rel.coverUrl} alt={rel.title} className="w-24 h-20 rounded-xl object-cover shrink-0 group-hover:scale-105 transition" />
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 inline-block mb-1">
                        {rel.category}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 leading-snug">
                        {rel.title}
                      </h4>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{rel.readTimeMinutes} min read</span>
                    <span className="flex items-center gap-0.5 font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition">
                      Read <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* QR Code Share Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 text-center shadow-2xl">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
              Read on Your Phone
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Scan this QR code with your mobile camera to transfer and read instantly.
            </p>

            <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.href)}`}
                alt="QR Code"
                className="w-44 h-44 mx-auto"
              />
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

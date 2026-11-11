import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ArticleCard } from './components/ArticleCard';
import { ArticleReader } from './components/ArticleReader';
import { PublishModal } from './components/PublishModal';
import { SecurityDashboard } from './components/SecurityDashboard';
import { RobotsTxtModal } from './components/RobotsTxtModal';
import { CloudConfigModal } from './components/CloudConfigModal';
import { SupabaseConnectModal } from './components/SupabaseConnectModal';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { PerformanceWidget } from './components/PerformanceWidget';
import { INITIAL_ARTICLES } from './data/initialArticles';
import { Article, ArticleCategory, AdminUser } from './types';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { 
  getSupabaseClient,
  fetchArticlesFromSupabase, 
  insertArticleToSupabase, 
  updateArticleInSupabase, 
  deleteArticleFromSupabase 
} from './services/supabaseService';
import {
  syncAuthenticatedGmailUser
} from './services/userService';
import { getSiteSettings, SiteSettings } from './services/siteSettingsService';
import { Flame, Sparkles, ShieldCheck, Newspaper, AlertCircle, ArrowUpRight } from 'lucide-react';

export default function AppContent() {
  // Articles state initialized from LocalStorage or seed data
  const [articles, setArticles] = useState<Article[]>(() => {
    const saved = localStorage.getItem('tintuc_articles_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_ARTICLES;
  });

  // Admin session state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('tintuc_admin_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.status === 'pending' || parsed?.status === 'suspended') {
          return null;
        }
        return parsed;
      } catch {}
    }
    return null;
  });

  // Site Settings state
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => getSiteSettings());

  useEffect(() => {
    const handleSettingsUpdated = () => setSiteSettings(getSiteSettings());
    window.addEventListener('site_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('site_settings_updated', handleSettingsUpdated);
  }, []);

  // Dynamically inject Google Analytics & Google Adsense scripts
  useEffect(() => {
    if (siteSettings.googleAnalyticsIds) {
      const ids = siteSettings.googleAnalyticsIds
        .split('\n')
        .map(id => id.trim())
        .filter(Boolean);

      ids.forEach(gaId => {
        const scriptId = `ga-script-${gaId}`;
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
          document.head.appendChild(script);

          const inlineScript = document.createElement('script');
          inlineScript.id = `ga-inline-${gaId}`;
          inlineScript.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `;
          document.head.appendChild(inlineScript);
        }
      });
    }

    if (siteSettings.googleAdsClientId) {
      const adsId = siteSettings.googleAdsClientId.trim();
      const scriptId = 'google-adsense-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsId)}`;
        script.setAttribute('crossorigin', 'anonymous');
        document.head.appendChild(script);
      }
    }
  }, [siteSettings]);

  // View & Modal states
  const [activeCategory, setActiveCategory] = useState<ArticleCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Modals & Dashboard Views
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isRobotsOpen, setIsRobotsOpen] = useState(false);
  const [isCloudConfigOpen, setIsCloudConfigOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardView, setIsAdminDashboardView] = useState(false);

  // Fetch from Supabase on mount if configured
  useEffect(() => {
    const loadFromSupabase = async () => {
      const data = await fetchArticlesFromSupabase();
      if (data && data.length > 0) {
        setArticles(data);
      }
    };
    loadFromSupabase();
  }, []);

  // Listen to Firebase Auth (Google OAuth Session)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (sessionStorage.getItem('suppress_auto_auth_listener') === 'true') {
        return;
      }

      if (!fbUser || !fbUser.email) {
        localStorage.removeItem('tintuc_admin_session');
        setAdminUser(null);
        setIsAdminDashboardView(false);
        return;
      }

      try {
        const { user: managedUser, isSuspended, isPendingApproval } =
          await syncAuthenticatedGmailUser({
            id: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email.split('@')[0],
            avatar: fbUser.photoURL || undefined,
          });

        if (isSuspended || isPendingApproval) {
          await signOut(auth);
          localStorage.removeItem('tintuc_admin_session');
          setAdminUser(null);
          setIsAdminDashboardView(false);
          return;
        }

        const syncedAdmin: AdminUser = {
          id: managedUser.id,
          username: managedUser.username,
          displayName: managedUser.displayName,
          email: managedUser.email,
          avatar: managedUser.avatar,
          role: managedUser.role,
          status: managedUser.status,
          emailVerified: true,
          permissions: managedUser.permissions,
        };

        localStorage.setItem('tintuc_admin_session', JSON.stringify(syncedAdmin));
        setAdminUser(syncedAdmin);
      } catch (err) {
        console.warn('Error syncing Firebase Auth user:', err);
      }
    });

    return () => unsubscribe();
  }, []);

  // Save articles to LocalStorage whenever modified
  useEffect(() => {
    localStorage.setItem('tintuc_articles_v3', JSON.stringify(articles));
  }, [articles]);

  // Clean HTML5 History API & Permalink Router
  const navigateTo = (pathStr: string) => {
    window.history.pushState({}, '', pathStr);
    window.dispatchEvent(new Event('popstate'));
  };

  // WordPress-Style Clean Direct Permalinks Router (domain.com/url-bai-viet)
  useEffect(() => {
    const parseUrlRoute = () => {
      const path = window.location.pathname.replace(/^\//, '');
      const rawHash = window.location.hash.replace(/^#\/?/, '');
      // Ignore Supabase Auth callback hash tokens (access_token, error_description, etc.)
      const hash = rawHash.startsWith('access_token=') || rawHash.startsWith('error=') ? '' : rawHash;
      const route = path || hash;

      if (!route) {
        // Default Home Route
        setActiveCategory('All');
        setSearchQuery('');
        setSelectedArticle(null);
        setIsAdminDashboardView(false);
        setShowBookmarksOnly(false);
        document.title = `${siteSettings.siteTitle} - ${siteSettings.siteTagline}`;
        return;
      }

      if (route.startsWith('category/')) {
        const rawCat = decodeURIComponent(route.replace('category/', ''));
        setActiveCategory(rawCat as ArticleCategory);
        setSelectedArticle(null);
        setIsAdminDashboardView(false);
        setShowBookmarksOnly(false);
        document.title = `Category: ${rawCat} - ${siteSettings.siteTitle}`;
        return;
      }

      if (route === 'admin') {
        setSelectedArticle(null);
        if (adminUser) {
          setIsAdminDashboardView(true);
        } else {
          setIsAdminLoginOpen(true);
        }
        document.title = `Admin Portal - ${siteSettings.siteTitle}`;
        return;
      }

      if (route === 'saved') {
        setSelectedArticle(null);
        setIsAdminDashboardView(false);
        setShowBookmarksOnly(true);
        document.title = `Saved Stories - ${siteSettings.siteTitle}`;
        return;
      }

      // Direct permalink resolution: domain.com/url-bai-viet (or fallback /news/url-bai-viet)
      const cleanSlug = route.startsWith('news/') ? route.replace('news/', '') : route;
      const found = articles.find(a => a.slug === cleanSlug || a.id === cleanSlug || a.slug === route || a.id === route);
      if (found) {
        setSelectedArticle(found);
        setIsAdminDashboardView(false);
        setShowBookmarksOnly(false);
        document.title = `${found.title} - ${siteSettings.siteTitle}`;
        return;
      }

      // Default Home Route fallback
      setActiveCategory('All');
      setSearchQuery('');
      setSelectedArticle(null);
      setIsAdminDashboardView(false);
      setShowBookmarksOnly(false);
      document.title = `${siteSettings.siteTitle} - ${siteSettings.siteTagline}`;
    };

    parseUrlRoute();
    window.addEventListener('hashchange', parseUrlRoute);
    window.addEventListener('popstate', parseUrlRoute);
    return () => {
      window.removeEventListener('hashchange', parseUrlRoute);
      window.removeEventListener('popstate', parseUrlRoute);
    };
  }, [articles, adminUser]);

  // Admin Handlers
  const handleOpenAdmin = () => {
    navigateTo('/admin');
  };

  const handleAdminLoginSuccess = (user: AdminUser) => {
    setAdminUser(user);
    setIsAdminLoginOpen(false);
    navigateTo('/admin');
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
    } catch {}
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('tintuc_admin_session');
    localStorage.removeItem('tintuc_auth_token');
    setAdminUser(null);
    setIsAdminDashboardView(false);
    navigateTo('/');
  };

  const handleDeleteArticle = (articleId: string) => {
    setArticles(prev => prev.map(a => {
      if (a.id === articleId) {
        updateArticleInSupabase(articleId, { status: 'draft' });
        return { ...a, status: 'draft' };
      }
      return a;
    }));
    if (selectedArticle?.id === articleId) {
      setSelectedArticle(null);
      navigateTo('/');
    }
  };

  const handleToggleArticleStatus = (articleId: string) => {
    setArticles(prev => prev.map(a => {
      if (a.id === articleId) {
        const nextStatus = a.status === 'draft' ? 'published' : 'draft';
        updateArticleInSupabase(articleId, { status: nextStatus });
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  const handleToggleFeatured = (articleId: string) => {
    setArticles(prev => prev.map(a => {
      if (a.id === articleId) {
        const next = !a.isFeatured;
        updateArticleInSupabase(articleId, { isFeatured: next });
        return { ...a, isFeatured: next };
      }
      return a;
    }));
  };

  const handleDeleteComment = (articleId: string, commentId: string) => {
    setArticles(prev => prev.map(a => {
      if (a.id === articleId) {
        const updatedComments = a.comments.filter(c => c.id !== commentId);
        updateArticleInSupabase(articleId, { comments: updatedComments, commentsCount: updatedComments.length });
        return { ...a, comments: updatedComments, commentsCount: updatedComments.length };
      }
      return a;
    }));
  };

  // Handle article selection (increment view count and update permalink URL: domain.com/url-bai-viet)
  const handleSelectArticle = (art: Article) => {
    setArticles(prev => prev.map(a => a.id === art.id ? { ...a, views: a.views + 1 } : a));
    updateArticleInSupabase(art.id, { views: art.views + 1 });
    navigateTo(`/${art.slug || art.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle bookmark state
  const handleToggleBookmark = (e?: React.MouseEvent, articleId?: string) => {
    if (e) e.stopPropagation();
    const targetId = articleId || selectedArticle?.id;
    if (!targetId) return;

    setArticles(prev => prev.map(a => {
      if (a.id === targetId) {
        return { ...a, isBookmarked: !a.isBookmarked };
      }
      return a;
    }));

    if (selectedArticle && selectedArticle.id === targetId) {
      setSelectedArticle(prev => prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null);
    }
  };

  // Add comment handler
  const handleAddComment = (articleId: string, text: string, authorName: string): boolean => {
    const newComment = {
      id: `c-${Date.now()}`,
      author: authorName,
      text,
      createdAt: new Date().toISOString(),
      likes: 0
    };

    setArticles(prev => prev.map(a => {
      if (a.id === articleId) {
        const updatedComments = [newComment, ...a.comments];
        updateArticleInSupabase(articleId, { comments: updatedComments, commentsCount: updatedComments.length });
        return {
          ...a,
          comments: updatedComments,
          commentsCount: updatedComments.length
        };
      }
      return a;
    }));

    if (selectedArticle && selectedArticle.id === articleId) {
      setSelectedArticle(prev => prev ? {
        ...prev,
        comments: [newComment, ...prev.comments],
        commentsCount: prev.commentsCount + 1
      } : null);
    }

    return true;
  };

  // Publish new article handler
  const handlePublishSuccess = (newArticle: Article) => {
    setArticles(prev => [newArticle, ...prev]);
    insertArticleToSupabase(newArticle);
    setActiveCategory('All');
    setShowBookmarksOnly(false);
    setSelectedArticle(newArticle);
  };

  // Filtered articles memo
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      // Category filter
      if (activeCategory !== 'All' && art.category !== activeCategory) {
        return false;
      }
      // Bookmarks filter
      if (showBookmarksOnly && !art.isBookmarked) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = art.title.toLowerCase().includes(q);
        const matchSummary = art.summary.toLowerCase().includes(q);
        const matchTag = art.tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSummary && !matchTag) return false;
      }
      return true;
    });
  }, [articles, activeCategory, showBookmarksOnly, searchQuery]);

  const featuredArticle = useMemo(() => {
    if (activeCategory !== 'All' || showBookmarksOnly || searchQuery) return null;
    return articles.find(a => a.isFeatured) || articles[0] || null;
  }, [articles, activeCategory, showBookmarksOnly, searchQuery]);

  const bookmarkedCount = useMemo(() => {
    return articles.filter(a => a.isBookmarked).length;
  }, [articles]);

  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return [];
    return articles.filter(a => a.id !== selectedArticle.id && a.category === selectedArticle.category);
  }, [articles, selectedArticle]);

  const handleUpdateArticle = (updatedArticle: Article) => {
    setArticles(prev => prev.map(a => a.id === updatedArticle.id ? updatedArticle : a));
    updateArticleInSupabase(updatedArticle.id, updatedArticle);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
        {isAdminDashboardView && adminUser ? (
          <AdminDashboard
            user={adminUser}
            articles={articles}
            onLogout={handleAdminLogout}
            onDeleteArticle={handleDeleteArticle}
            onUpdateArticle={handleUpdateArticle}
            onToggleArticleStatus={handleToggleArticleStatus}
            onToggleFeatured={handleToggleFeatured}
            onDeleteComment={handleDeleteComment}
            onOpenPublish={() => setIsPublishOpen(true)}
            onOpenSecurity={() => setIsSecurityOpen(true)}
            onOpenCloudConfig={() => setIsSupabaseModalOpen(true)}
            onViewArticle={(art) => {
              setIsAdminDashboardView(false);
              handleSelectArticle(art);
            }}
            onGoHome={() => {
              setIsAdminDashboardView(false);
              navigateTo('/');
            }}
          />
        ) : selectedArticle ? (
          /* Reader View */
          <ArticleReader
            article={selectedArticle}
            onBack={() => {
              navigateTo('/');
            }}
            onToggleBookmark={(id) => handleToggleBookmark(undefined, id)}
            relatedArticles={relatedArticles}
            onSelectRelated={handleSelectArticle}
          />
        ) : (
          /* Main Feed View */
          <>
            <Header
              activeCategory={activeCategory}
              onSelectCategory={(cat) => {
                navigateTo(cat === 'All' ? '/' : `/category/${encodeURIComponent(cat)}`);
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenPublish={() => setIsPublishOpen(true)}
              onOpenSecurity={() => setIsSecurityOpen(true)}
              onOpenRobots={() => setIsRobotsOpen(true)}
              onOpenCloudConfig={() => setIsSupabaseModalOpen(true)}
              onOpenAdmin={handleOpenAdmin}
              adminUser={adminUser}
              onToggleBookmarksOnly={() => {
                navigateTo(showBookmarksOnly ? '/' : '/saved');
              }}
              showBookmarksOnly={showBookmarksOnly}
              bookmarkedCount={bookmarkedCount}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
              {/* Category Title & Filter Indicator */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    {showBookmarksOnly ? (
                      <>
                        <span className="text-indigo-600 dark:text-indigo-400">Saved Stories</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                          {filteredArticles.length} stories
                        </span>
                      </>
                    ) : searchQuery ? (
                      <>Search Results: "{searchQuery}"</>
                    ) : (
                      <>{activeCategory === 'All' ? 'Latest Headlines' : `Category: ${activeCategory}`}</>
                    )}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Minimalist • Ultra-Fast • Mobile Optimized & Dark Mode
                  </p>
                </div>

                {showBookmarksOnly && (
                  <button
                    onClick={() => {
                      navigateTo('/');
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    ← View All News
                  </button>
                )}
              </div>

              {/* Featured Main Story Banner (If on all category & no query) */}
              {featuredArticle && (
                <section className="mb-8">
                  <ArticleCard
                    article={featuredArticle}
                    onSelect={handleSelectArticle}
                    onToggleBookmark={(e, id) => handleToggleBookmark(e, id)}
                    isFeatured={true}
                  />
                </section>
              )}

              {/* Grid of Latest News */}
              {filteredArticles.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 max-w-md mx-auto">
                  <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                    No articles found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Try searching with another keyword or clear category filters.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      navigateTo('/');
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs shadow"
                  >
                    View All Headlines
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredArticles
                    .filter(a => !featuredArticle || a.id !== featuredArticle.id)
                    .map(article => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        onSelect={handleSelectArticle}
                        onToggleBookmark={(e, id) => handleToggleBookmark(e, id)}
                      />
                    ))}
                </div>
              )}
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav
              activeCategory={activeCategory}
              onSelectCategory={(cat) => {
                navigateTo(cat === 'All' ? '/' : `/category/${encodeURIComponent(cat)}`);
              }}
              onOpenPublish={() => setIsPublishOpen(true)}
              onOpenSecurity={() => setIsSecurityOpen(true)}
              onToggleBookmarksOnly={() => {
                navigateTo(showBookmarksOnly ? '/' : '/saved');
              }}
              showBookmarksOnly={showBookmarksOnly}
              bookmarkedCount={bookmarkedCount}
              adminUser={adminUser}
            />

            {/* Subtle Reader Footer with Admin Portal Login */}
            <footer className="mt-16 py-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
                <div>
                  {siteSettings.footerCopyright}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleOpenAdmin}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-2 transition"
                  >
                    {adminUser ? `Logged in: ${adminUser.displayName}` : 'Admin Portal Login'}
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}

        {/* Floating Speed Widget */}
        <PerformanceWidget />

        {/* Modals */}
        <PublishModal
          isOpen={isPublishOpen}
          onClose={() => setIsPublishOpen(false)}
          onPublishSuccess={handlePublishSuccess}
        />

        <SecurityDashboard
          isOpen={isSecurityOpen}
          onClose={() => setIsSecurityOpen(false)}
          onOpenRobots={() => {
            setIsSecurityOpen(false);
            setIsRobotsOpen(true);
          }}
        />

        <RobotsTxtModal
          isOpen={isRobotsOpen}
          onClose={() => setIsRobotsOpen(false)}
        />

        <CloudConfigModal
          isOpen={isCloudConfigOpen}
          onClose={() => setIsCloudConfigOpen(false)}
        />

        <SupabaseConnectModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          onConnected={async () => {
            const data = await fetchArticlesFromSupabase();
            if (data && data.length > 0) setArticles(data);
          }}
        />

        <AdminLogin
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onLoginSuccess={handleAdminLoginSuccess}
        />
      </div>
    </ThemeProvider>
  );
}

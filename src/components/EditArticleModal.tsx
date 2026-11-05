import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Edit3, 
  Save, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  Wand2,
  Eye,
  Trash2,
  Globe,
  ExternalLink,
  RefreshCw,
  Plus,
  Image as ImageIcon
} from 'lucide-react';
import { ArticleCategory, Article } from '../types';
import { generateArticleSummary, generateArticleTags, proofreadArticle } from '../services/geminiService';
import { sanitizeHTML } from '../services/securityService';
import { getAllCategories, saveCustomCategory } from '../services/categoryService';
import { MediaLibraryModal } from './MediaLibraryModal';
import { WpContentEditor, WpContentEditorRef } from './WpContentEditor';

interface EditArticleModalProps {
  isOpen: boolean;
  article: Article | null;
  onClose: () => void;
  onSaveSuccess: (updatedArticle: Article) => void;
  onDeleteArticle?: (articleId: string) => void;
}

const PRESET_IMAGES = [
  { label: 'AI & Tech', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Cybersecurity', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Smart City', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Business', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80' },
  { label: 'EV Mobility', url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80' }
];

export const EditArticleModal: React.FC<EditArticleModalProps> = ({
  isOpen,
  article,
  onClose,
  onSaveSuccess,
  onDeleteArticle
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<ArticleCategory>('Technology');
  const [categoriesList, setCategoriesList] = useState<string[]>(() => getAllCategories());
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const editorRef = useRef<WpContentEditorRef>(null);

  // Loading & Feedback states
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isProofreading, setIsProofreading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const slugify = (str: string) => {
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setSlug(article.slug || slugify(article.title));
      setCategory(article.category);
      setCategoriesList(getAllCategories([{ category: article.category }]));
      setSummary(article.summary);
      setContent(article.content);
      setCoverUrl(article.coverUrl);
      setAuthorName(article.author.name);
      setTagsInput(article.tags ? article.tags.join(', ') : '');
      setStatus(article.status || 'published');
      setErrorMessage('');
      setIsAddingCategory(false);
      setNewCategoryInput('');
    }
  }, [article]);

  if (!isOpen || !article) return null;

  const handleGenerateSlugFromTitle = () => {
    if (title.trim()) {
      setSlug(slugify(title));
    }
  };

  const handleCreateCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (trimmed) {
      saveCustomCategory(trimmed);
      const updated = getAllCategories();
      setCategoriesList(updated);
      setCategory(trimmed);
      setNewCategoryInput('');
      setIsAddingCategory(false);
    }
  };

  // AI Summary Generator handler
  const handleAiSummary = async () => {
    if (!title && !content) return;
    setIsGeneratingSummary(true);
    setErrorMessage('');
    try {
      const res = await generateArticleSummary(title, content);
      setSummary(res);
    } catch {
      setErrorMessage('AI Service error. Please enter summary manually.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // AI Tag Generator handler
  const handleAiTags = async () => {
    if (!title && !content) return;
    setIsGeneratingTags(true);
    try {
      const tags = await generateArticleTags(title, content);
      setTagsInput(tags.join(', '));
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // AI Proofreader handler
  const handleAiProofread = async () => {
    if (!title || !content) return;
    setIsProofreading(true);
    try {
      const result = await proofreadArticle(title, content);
      setTitle(result.title);
      setContent(result.content);
    } finally {
      setIsProofreading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim() || !content.trim()) {
      setErrorMessage('Title and Content fields cannot be empty.');
      return;
    }

    setIsSaving(true);

    try {
      const sanitizedContent = sanitizeHTML(content);
      const sanitizedTitle = sanitizeHTML(title);
      const sanitizedSummary = sanitizeHTML(summary) || sanitizedContent.slice(0, 140) + '...';

      const tagsArray = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const finalSlug = slug.trim() ? slugify(slug) : slugify(sanitizedTitle);

      const updatedArticle: Article = {
        ...article,
        title: sanitizedTitle,
        slug: finalSlug,
        summary: sanitizedSummary,
        content: sanitizedContent,
        category,
        coverUrl,
        author: {
          ...article.author,
          name: authorName.trim() || article.author.name
        },
        readTimeMinutes: Math.max(1, Math.ceil(sanitizedContent.split(' ').length / 200)),
        status,
        tags: tagsArray.length > 0 ? tagsArray : ['Trending']
      };

      onSaveSuccess(updatedArticle);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating article.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto transition-all">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Edit Article</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  ID: {article.id}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update content, custom URL slug, category, cover image or status
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* AI Assistant Toolbar */}
          <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span>Gemini AI Tools:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAiSummary}
                disabled={isGeneratingSummary}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition flex items-center gap-1"
              >
                <Wand2 className="w-3 h-3 text-indigo-500" />
                <span>{isGeneratingSummary ? 'Summarizing...' : 'Auto Summarize'}</span>
              </button>

              <button
                type="button"
                onClick={handleAiTags}
                disabled={isGeneratingTags}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition flex items-center gap-1"
              >
                <Tag className="w-3 h-3 text-indigo-500" />
                <span>{isGeneratingTags ? 'Tagging...' : 'Suggest Hashtags'}</span>
              </button>

              <button
                type="button"
                onClick={handleAiProofread}
                disabled={isProofreading}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                <span>{isProofreading ? 'Polishing...' : 'AI Polish'}</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Article Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title..."
              required
              className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          {/* WordPress Permalink / Custom URL Slug Section */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>Custom URL Slug</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateSlugFromTitle}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Auto Slug from Title</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono select-none hidden sm:inline">
                {window.location.origin}/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="custom-url-slug"
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold outline-none focus:border-indigo-500"
              />
              <a
                href={`/${slug || article.slug || article.id}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
                title="Preview URL in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              Live URL Preview: <code className="text-slate-700 dark:text-slate-200 font-mono bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{window.location.origin}/{slug || 'custom-slug'}</code>
            </p>
          </div>

          {/* Category, Status & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Category *
                </label>
                {!isAddingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Category</span>
                  </button>
                )}
              </div>

              {isAddingCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                    placeholder="New category..."
                    autoFocus
                    className="flex-1 min-w-0 px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-indigo-500 text-slate-900 dark:text-white outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingCategory(false); setNewCategoryInput(''); }}
                    className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl text-xs font-semibold transition shrink-0"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsAddingCategory(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__NEW__">+ Add New Category...</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
                className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="published">Published</option>
                <option value="draft">Draft / Hidden</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Author
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author name..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Brief Excerpt Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summary overview..."
              rows={2}
              className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Article Content (WordPress Classic Editor) *
            </label>
            <WpContentEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              onOpenMediaModal={() => setIsMediaModalOpen(true)}
              placeholder="Write story content here..."
              minRows={8}
            />
          </div>

          {/* Cover Image Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Cover Image URL
            </label>

            <div className="grid grid-cols-5 gap-2 mb-2">
              {PRESET_IMAGES.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCoverUrl(img.url)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition ${
                    coverUrl === img.url ? 'border-indigo-600 scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="Image URL..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Hashtags (Comma Separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tech, AI, Security"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {onDeleteArticle ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteArticle(article.id);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Move to Trash</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>

        <MediaLibraryModal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          onInsertMedia={(url, altText) => {
            if (editorRef.current) {
              editorRef.current.insertMedia(url, altText);
            }
          }}
        />
      </div>
    </div>
  );
};

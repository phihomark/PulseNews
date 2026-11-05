import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  FileText, 
  Send, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  Wand2,
  Lock,
  Plus,
  Image as ImageIcon
} from 'lucide-react';
import { ArticleCategory, Article } from '../types';
import { generateArticleSummary, generateArticleTags, proofreadArticle } from '../services/geminiService';
import { generatePoWPuzzle, sanitizeHTML, verifyPublishSecurity } from '../services/securityService';
import { getAllCategories, saveCustomCategory } from '../services/categoryService';
import { MediaLibraryModal } from './MediaLibraryModal';
import { WpContentEditor, WpContentEditorRef } from './WpContentEditor';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishSuccess: (article: Article) => void;
}

const PRESET_IMAGES = [
  { label: 'AI & Tech', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Cybersecurity', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Smart City', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Business', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80' },
  { label: 'EV Mobility', url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80' }
];

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  onPublishSuccess
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ArticleCategory>('Technology');
  const [categoriesList, setCategoriesList] = useState<string[]>(() => getAllCategories());
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState(PRESET_IMAGES[0].url);
  const [authorName, setAuthorName] = useState('Staff Writer');
  const [tagsInput, setTagsInput] = useState('PulseNews, Tech');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const editorRef = React.useRef<WpContentEditorRef>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCategory('Technology');
      setCategoriesList(getAllCategories());
      setIsAddingCategory(false);
      setNewCategoryInput('');
      setSummary('');
      setContent('');
      setCoverUrl(PRESET_IMAGES[0].url);
      setAuthorName('Staff Writer');
      setTagsInput('PulseNews, Tech');
      setHoneypotTrap('');
      setPowUserAnswer('');
      setErrorMessage('');
    }
  }, [isOpen]);

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
  
  // Security Honeypot state
  const [honeypotTrap, setHoneypotTrap] = useState('');

  // Human verification PoW puzzle
  const [powPuzzle] = useState(generatePoWPuzzle());
  const [powUserAnswer, setPowUserAnswer] = useState('');

  // Loading & Feedback states
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isProofreading, setIsProofreading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // AI Summary Generator handler
  const handleAiSummary = async () => {
    if (!title && !content) {
      setErrorMessage('Please enter a title or content before running AI Summary.');
      return;
    }
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

    // Verify Proof of Work Math challenge
    if (parseInt(powUserAnswer.trim(), 10) !== powPuzzle.answer) {
      setErrorMessage(`Human verification answer is incorrect (${powPuzzle.question}). Please try again.`);
      return;
    }

    setIsPublishing(true);

    try {
      const secResult = await verifyPublishSecurity({
        title,
        content,
        honeypotTrap
      });

      if (!secResult.success) {
        setErrorMessage(secResult.message);
        setIsPublishing(false);
        return;
      }

      const sanitizedContent = sanitizeHTML(content);
      const sanitizedTitle = sanitizeHTML(title);
      const sanitizedSummary = sanitizeHTML(summary) || sanitizedContent.slice(0, 140) + '...';

      const tagsArray = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const newArticle: Article = {
        id: `art-user-${Date.now()}`,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        title: sanitizedTitle,
        summary: sanitizedSummary,
        content: sanitizedContent,
        category,
        coverUrl,
        author: {
          name: authorName.trim() || 'Contributor',
          role: 'Staff Writer'
        },
        publishedAt: new Date().toISOString(),
        readTimeMinutes: Math.max(1, Math.ceil(sanitizedContent.split(' ').length / 200)),
        views: 1,
        likes: 0,
        status: 'published',
        tags: tagsArray.length > 0 ? tagsArray : ['Trending'],
        commentsCount: 0,
        comments: []
      };

      onPublishSuccess(newArticle);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error publishing article.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto transition-all">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                Publish New Article
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mobile Optimized • WAF Protected • Gemini AI Powered
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
          <input
            type="text"
            name="hp_fax_number_trap"
            value={honeypotTrap}
            onChange={(e) => setHoneypotTrap(e.target.value)}
            className="hidden opacity-0 pointer-events-none absolute -left-[9999px]"
            tabIndex={-1}
            autoComplete="off"
          />

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* AI Helper Bar */}
          <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span>Gemini AI Assistant:</span>
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
                <span>{isProofreading ? 'Proofreading...' : 'AI Polish'}</span>
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
              placeholder="Enter compelling headline..."
              required
              className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                Author Name
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Michael Vance"
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
              placeholder="Enter 1-2 sentence core overview..."
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
              Cover Image Selection
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
              placeholder="Or paste custom image URL..."
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

          {/* Human Proof of Work Challenge */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Anti-Bot Human Verification Challenge (Proof of Work)</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800">
                {powPuzzle.question}
              </span>
              <input
                type="number"
                value={powUserAnswer}
                onChange={(e) => setPowUserAnswer(e.target.value)}
                placeholder="Result..."
                required
                className="w-32 px-3 py-1.5 text-sm font-bold bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPublishing}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-xs shadow-lg shadow-indigo-500/30 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isPublishing ? 'Verifying & Publishing...' : 'Publish Article'}</span>
            </button>
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

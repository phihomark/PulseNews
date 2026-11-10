import React, { useState } from 'react';
import { Cloud, Database, ExternalLink, Copy, Check, X, Server, Terminal } from 'lucide-react';
import { CloudDatabaseService } from '../services/dbService';

interface CloudConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudConfigModal: React.FC<CloudConfigModalProps> = ({ isOpen, onClose }) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [activeTab, setActiveTab] = useState<'vercel' | 'database'>('vercel');

  if (!isOpen) return null;

  const sqlCode = CloudDatabaseService.getSupabaseSchemaSQL();

  const envTemplate = `# Environment Variables for Vercel Deployment (Settings -> Environment Variables)

# 1. Gemini AI API Key (Server-side API Proxy - Secure & Hidden)
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"

# 2. Cloud DB Connection (Supabase)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white flex items-center justify-center font-bold shadow-md">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Vercel Deployment & Cloud DB Guide
              </h3>
              <p className="text-xs text-slate-400">
                Optimized for Vercel CDN + Supabase / PostgreSQL Database
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('vercel')}
            className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'vercel'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>1. Deploy to Vercel (3 Steps)</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'database'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>2. Supabase SQL Migration Schema</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
          {activeTab === 'vercel' ? (
            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-500" />
                  <span>Deployment Checklist:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li><strong>Push to GitHub</strong>: Push this codebase repository to your GitHub account.</li>
                  <li><strong>Import to Vercel</strong>: Go to <em>Vercel.com → Add New → Project</em> and select your repository.</li>
                  <li><strong>Auto Build & Deploy</strong>: Vercel auto-detects the **Vite React** app. Click **Deploy**.</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Required Environment Variables:
                  </span>
                  <button
                    onClick={handleCopyEnv}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                  >
                    {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEnv ? 'Copied' : 'Copy .env'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  <pre>{envTemplate}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Copy the SQL migration statement below and execute it in <strong>Supabase SQL Editor</strong>:
                </p>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow transition shrink-0"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 text-cyan-300 font-mono text-xs leading-relaxed overflow-x-auto border border-slate-800 max-h-72 overflow-y-auto">
                <pre>{sqlCode}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Vercel Dashboard</span>
          </a>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

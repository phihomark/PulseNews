import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Copy, Check, RefreshCw, X, Sparkles } from 'lucide-react';
import { 
  getSavedSupabaseCredentials, 
  saveSupabaseCredentials, 
  testSupabaseConnection, 
  seedArticlesToSupabase, 
  getSupabaseSQLMigrationScript 
} from '../services/supabaseService';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({
  isOpen,
  onClose,
  onConnected
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string }>({});
  const [isTesting, setIsTesting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const creds = getSavedSupabaseCredentials();
      setSupabaseUrl(creds.supabaseUrl);
      setSupabaseAnonKey(creds.supabaseAnonKey);
      setTestResult({});
      setSeedSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sqlScript = getSupabaseSQLMigrationScript();

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleTestConnection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter both Supabase Project URL and Anon Key.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult({});

    saveSupabaseCredentials({
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim()
    });

    const res = await testSupabaseConnection({
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim()
    });

    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      onConnected();
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    setSeedSuccessMsg('');
    const ok = await seedArticlesToSupabase();
    setIsSeeding(false);
    if (ok) {
      setSeedSuccessMsg('✓ Sample news stories successfully seeded into Supabase database!');
      onConnected();
    } else {
      setTestResult({
        success: false,
        message: 'Could not seed data. Please make sure the "articles" table has been created using the SQL script below.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Supabase Database Integration</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  REALTIME DB
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Store articles, comments, and settings directly on Supabase Cloud PostgreSQL
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[78vh] overflow-y-auto space-y-6">
          {/* Step 1: SQL Editor Script */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px] flex items-center justify-center">1</span>
                Create "articles" Table in Supabase SQL Editor
              </span>

              <button
                type="button"
                onClick={handleCopySql}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow transition"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied' : 'Copy SQL Script'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Supabase Dashboard</a> → select project → click <strong>SQL Editor</strong> → paste statement and click <strong>RUN</strong>:
            </p>

            <div className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-36 overflow-y-auto border border-slate-800">
              <pre>{sqlScript}</pre>
            </div>
          </div>

          {/* Step 2: Form Credentials */}
          <form onSubmit={handleTestConnection} className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px] flex items-center justify-center">2</span>
              Enter Supabase Credentials
            </span>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Supabase Project URL *
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzproject.supabase.co"
                required
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Supabase Anon Key (public) *
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                required
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {testResult.message && (
              <div className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                <div className="flex-1 leading-relaxed">{testResult.message}</div>
              </div>
            )}

            {seedSuccessMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                {seedSuccessMsg}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {testResult.success && (
                <button
                  type="button"
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSeeding ? 'Seeding...' : 'Seed Sample News to Supabase'}</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isTesting}
                className="ml-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Verifying...' : 'Test & Save Connection'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

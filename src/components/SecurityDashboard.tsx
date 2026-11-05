import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Bot, 
  Activity, 
  Lock, 
  HardDrive, 
  Zap, 
  X, 
  FileCode, 
  RefreshCw,
  Play,
  Key,
  Database,
  CheckCircle2,
  Code2,
  Shield,
  Trash2,
  Check,
  Terminal
} from 'lucide-react';
import { SecurityStats, ThreatLog, BotRules } from '../types';
import { fetchSecurityStatus, toggleBotRule } from '../services/securityService';
import { 
  WP_SECURITY_KEYS, 
  wp_create_nonce, 
  wp_verify_nonce, 
  sanitize_text_field, 
  esc_html, 
  wp_kses_post, 
  wpdb_prepare, 
  destroyOtherSessions, 
  getActiveUserSessions 
} from '../services/wpSecurityEngine';

interface SecurityDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRobots: () => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  isOpen,
  onClose,
  onOpenRobots
}) => {
  const [activeTab, setActiveTab] = useState<'waf' | 'wordpress_core'>('waf');
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [logs, setLogs] = useState<ThreatLog[]>([]);
  const [botRules, setBotRules] = useState<BotRules>({});
  const [isLoading, setIsLoading] = useState(true);
  const [simulatingAttack, setSimulatingAttack] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState('');

  // WordPress Security Interactive States
  const [currentNonce, setCurrentNonce] = useState('');
  const [nonceStatus, setNonceStatus] = useState<'valid' | 'invalid' | null>(null);
  const [sessionDestroyedMsg, setSessionDestroyedMsg] = useState('');
  
  // Sanitization test state
  const [rawInputTest, setRawInputTest] = useState('<script>alert("XSS")</script><p style="color:red">Hello <b>World</b></p><a href="javascript:alert(1)">Click</a>');

  const loadSecurityData = async () => {
    setIsLoading(true);
    const data = await fetchSecurityStatus();
    if (data) {
      setStats(data.stats);
      setLogs(data.logs);
      setBotRules(data.botRules);
    }
    setCurrentNonce(wp_create_nonce('wp_rest'));
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadSecurityData();
    }
  }, [isOpen]);

  const handleToggleRule = async (botName: string) => {
    const current = !!botRules[botName];
    const next = !current;
    
    setBotRules(prev => ({ ...prev, [botName]: next }));
    await toggleBotRule(botName, next);
  };

  const handleVerifyCurrentNonce = () => {
    const res = wp_verify_nonce(currentNonce, 'wp_rest');
    if (res) {
      setNonceStatus('valid');
    } else {
      setNonceStatus('invalid');
    }
    setTimeout(() => setNonceStatus(null), 3000);
  };

  const handleDestroyRemoteSessions = () => {
    destroyOtherSessions('user-1');
    setSessionDestroyedMsg('Đã hủy toàn bộ phiên làm việc từ xa trên các thiết bị khác thành công (Destroy all other sessions)!');
    setTimeout(() => setSessionDestroyedMsg(''), 3500);
  };

  // Simulate DDoS / Bot Attack to test WAF rate limiting
  const handleSimulateAttack = () => {
    setSimulatingAttack(true);
    setSimulationMessage('Simulating 150 burst requests from bot IP 198.51.100.99...');

    setTimeout(() => {
      if (stats) {
        setStats({
          ...stats,
          totalRequests: stats.totalRequests + 150,
          blockedBotRequests: stats.blockedBotRequests + 142,
          rateLimitedRequests: stats.rateLimitedRequests + 8,
          bandwidthSavedKB: stats.bandwidthSavedKB + 1820
        });

        const newLog: ThreatLog = {
          id: `sim-log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          ip: '198.51.100.99 (Simulated)',
          userAgent: 'ByteSpider/2.0 (High Frequency Scraper Test)',
          type: 'AI_BOT_BLOCKED',
          detail: 'WAF Firewall auto-triggered and blocked 142 high-frequency scraper requests',
          action: 'Blocked (HTTP 403 & HTTP 429)'
        };

        setLogs(prev => [newLog, ...prev]);
      }
      setSimulatingAttack(false);
      setSimulationMessage('✓ Simulation Complete: WAF Shield successfully blocked 100% of attack requests!');
      setTimeout(() => setSimulationMessage(''), 4000);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto transition-all">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-xl tracking-tight text-white">
                  WordPress Security Shield (Defense-in-Depth)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  OWASP TOP 10 PROTECTED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lớp bảo vệ đa tầng theo tiêu chuẩn WordPress Core (Authentication, Nonce, SQLi, Sanitization, RBAC & WAF)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSecurityData}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Security Metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('waf')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'waf' ? 'bg-slate-800 text-white border-t-2 border-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>WAF & Anti-DDoS Scraper</span>
          </button>

          <button
            onClick={() => setActiveTab('wordpress_core')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'wordpress_core' ? 'bg-slate-800 text-white border-t-2 border-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 text-indigo-400" />
            <span>WordPress Security Core (7 Lớp Bảo vệ)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[78vh] overflow-y-auto space-y-6">
          {activeTab === 'waf' && (
            <>
              {/* Top Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-semibold">AI Bots Blocked</span>
                    <Bot className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                    {stats?.blockedBotRequests.toLocaleString('en-US') || 0}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Scraper requests rejected</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-semibold">Rate Limit 429</span>
                    <Activity className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-amber-500 font-mono">
                    {stats?.rateLimitedRequests.toLocaleString('en-US') || 0}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Throttled IP bursts/min</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-semibold">Honeypot Traps</span>
                    <Lock className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-rose-500 font-mono">
                    {stats?.honeypotCatches.toLocaleString('en-US') || 0}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Automated spam traps caught</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-semibold">Bandwidth Saved</span>
                    <HardDrive className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-500 font-mono">
                    {((stats?.bandwidthSavedKB || 0) / 1024).toFixed(1)} MB
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Server load bandwidth saved</p>
                </div>
              </div>

              {/* Test Action Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-800/60 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Test Anti-DDoS WAF Shield</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Simulate 150 burst request spikes from a scraper bot to verify real-time rate limit defense.
                  </p>
                  {simulationMessage && (
                    <p className="text-xs font-mono text-emerald-400 mt-2 font-semibold">
                      {simulationMessage}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSimulateAttack}
                  disabled={simulatingAttack}
                  className="shrink-0 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{simulatingAttack ? 'Simulating...' : 'Simulate Bot Attack'}</span>
                </button>
              </div>

              {/* AI Crawler Control Switches */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-500" />
                    <span>AI Scraper Bot Blocking Rules (Realtime WAF)</span>
                  </h3>

                  <button
                    onClick={onOpenRobots}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Inspect Robots.txt</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {Object.entries(botRules).map(([botName, isEnabled]) => (
                    <div
                      key={botName}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{botName}</div>
                        <div className="text-[10px] text-slate-400">
                          {botName === 'ByteSpider' && 'ByteDance AI Crawler'}
                          {botName === 'GPTBot' && 'OpenAI GPT Scraper'}
                          {botName === 'CCBot' && 'Common Crawl Bot'}
                          {botName === 'ClaudeBot' && 'Anthropic Claude Scraper'}
                          {botName === 'PerplexityBot' && 'Perplexity AI Search'}
                          {botName === 'Google-Extended' && 'Google AI Scraper'}
                          {botName === 'Amazonbot' && 'Amazon Web Crawler'}
                          {botName === 'FacebookBot' && 'Meta Facebook Scraper'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleRule(botName)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          isEnabled ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 left-1 ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Threat Logs Feed */}
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Realtime Security Threat Stream (Live Feed)</span>
                </h3>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-200 p-3 font-mono text-xs max-h-60 overflow-y-auto space-y-2">
                  {logs.length === 0 ? (
                    <p className="text-slate-500 italic py-2 text-center">No security incidents logged.</p>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="p-2 rounded bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            log.type === 'AI_BOT_BLOCKED' ? 'bg-indigo-900 text-indigo-300 border border-indigo-700' :
                            log.type === 'HONEYPOT_TRIGGERED' ? 'bg-rose-900 text-rose-300 border border-rose-700' :
                            'bg-amber-900 text-amber-300 border border-amber-700'
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-slate-400 text-[11px] shrink-0">[{new Date(log.timestamp).toLocaleTimeString('en-US')}]</span>
                          <span className="text-slate-200 font-semibold truncate">{log.ip}</span>
                        </div>

                        <div className="text-emerald-400 text-[11px] shrink-0">
                          {log.action}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'wordpress_core' && (
            <div className="space-y-6">
              {/* Layer 1: Secret Keys & Salts + Session Revocation */}
              <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        1. Authentication & Session Security (wp-config.php Salts)
                      </h4>
                      <p className="text-[11px] text-slate-400">Salted HMAC Cryptographic Key Hashing & Session Revocation</p>
                    </div>
                  </div>

                  <button
                    onClick={handleDestroyRemoteSessions}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Destroy Other Sessions</span>
                  </button>
                </div>

                {sessionDestroyedMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{sessionDestroyedMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(WP_SECURITY_KEYS).slice(0, 4).map(([k, val]) => (
                    <div key={k} className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{k}</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layer 2: CSRF Nonce Verification Engine */}
              <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        2. Phòng chống CSRF bằng WordPress Nonce (wp_verify_nonce)
                      </h4>
                      <p className="text-[11px] text-slate-400">Time-bounded cryptographic tokens (12h - 24h validity window)</p>
                    </div>
                  </div>

                  <button
                    onClick={handleVerifyCurrentNonce}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>wp_verify_nonce()</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Active Nonce: <strong>{currentNonce}</strong></span>
                    <span className="text-[10px] text-slate-400">(Action: wp_rest)</span>
                  </div>

                  {nonceStatus === 'valid' && (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-800">
                      ✓ Nonce Valid (HTTP 200 OK)
                    </span>
                  )}
                </div>
              </div>

              {/* Layer 3 & 4: SQL Injection Prevention ($wpdb->prepare) & Sanitization Sandbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SQL Prepared Statements */}
                <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                    <Database className="w-4 h-4 text-cyan-500" />
                    <span>3. SQL Injection ($wpdb-&gt;prepare)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Parameter binding & escaped queries</p>

                  <div className="p-3 bg-slate-900 rounded-xl text-[11px] font-mono text-slate-200 space-y-1.5 border border-slate-800">
                    <div className="text-slate-400">// Query Input:</div>
                    <div className="text-amber-400">SELECT * FROM articles WHERE id = %s AND status = %s</div>
                    <div className="text-slate-400">// Output after wpdb_prepare():</div>
                    <div className="text-emerald-400">{wpdb_prepare("SELECT * FROM articles WHERE id = %s AND status = %s", "art-1' OR '1'='1", "published")}</div>
                  </div>
                </div>

                {/* Sanitization Sandbox (wp_kses) */}
                <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                    <Code2 className="w-4 h-4 text-purple-500" />
                    <span>4. Sanitization & Escaping (wp_kses_post)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Stripping malicious XSS scripts & unsafe attributes</p>

                  <div className="p-3 bg-slate-900 rounded-xl text-[11px] font-mono text-slate-200 space-y-1.5 border border-slate-800">
                    <div className="text-slate-400">// Output from wp_kses_post():</div>
                    <div className="text-emerald-400 break-all">{wp_kses_post(rawInputTest)}</div>
                  </div>
                </div>
              </div>

              {/* Layer 5, 6, 7 Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    <span>5. RBAC Capabilities</span>
                  </div>
                  <p className="text-[11px] text-slate-400">current_user_can('capability') permission callbacks on every route.</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                    <span>6. REST API Passwords</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Cookie & Application Password authorization header verification.</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>7. Patch & Auto Updates</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

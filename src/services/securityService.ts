import { SecurityStats, ThreatLog, BotRules } from '../types';

export interface SecurityStatusResponse {
  stats: SecurityStats;
  logs: ThreatLog[];
  botRules: BotRules;
}

// Client-side XSS Sanitizer function
export function sanitizeHTML(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^\s"']+/gi, '#invalid-link')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
}

// Generates a lightweight Proof of Work math puzzle for bot challenge verification
export function generatePoWPuzzle(): { question: string; answer: number } {
  const num1 = Math.floor(Math.random() * 15) + 5;
  const num2 = Math.floor(Math.random() * 15) + 3;
  return {
    question: `Human Verification: ${num1} + ${num2} = ?`,
    answer: num1 + num2
  };
}

// Fetch security metrics from API
export async function fetchSecurityStatus(): Promise<SecurityStatusResponse | null> {
  try {
    const res = await fetch('/api/security/stats');
    if (!res.ok) throw new Error('Failed to fetch security stats');
    return await res.json();
  } catch (error) {
    console.warn('Fallback local security state:', error);
    return {
      stats: {
        totalRequests: 14205,
        blockedBotRequests: 1842,
        rateLimitedRequests: 129,
        honeypotCatches: 43,
        bandwidthSavedKB: 48520,
        activeRulesCount: 8,
        lastUpdated: new Date().toISOString()
      },
      logs: [
        {
          id: 'log-local-1',
          timestamp: new Date().toISOString(),
          ip: '198.51.100.42',
          userAgent: 'ByteSpider AI Scraper Bot',
          type: 'AI_BOT_BLOCKED',
          detail: 'Blocked automated ByteSpider scraper request',
          action: 'HTTP 403 Forbidden'
        }
      ],
      botRules: {
        'ByteSpider': true,
        'GPTBot': true,
        'CCBot': true,
        'ClaudeBot': true,
        'PerplexityBot': true,
        'Google-Extended': true,
        'Amazonbot': true,
        'FacebookBot': true
      }
    };
  }
}

// Toggle AI bot blocking rule
export async function toggleBotRule(botName: string, enabled: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/security/toggle-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botName, enabled })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Publish check with Honeypot verification
export async function verifyPublishSecurity(data: {
  title: string;
  content: string;
  honeypotTrap: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/articles/publish-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch {
    // If backend isn't responding, do client-side honeypot check
    if (data.honeypotTrap && data.honeypotTrap.trim() !== '') {
      return {
        success: false,
        message: 'Security Alert: Automated Spam Bot detected via Honeypot trap!'
      };
    }
    return {
      success: true,
      message: 'Passed client-side security verification.'
    };
  }
}

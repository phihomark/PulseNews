/**
 * Client-side Gemini AI Service
 * Calls server-side proxy routes to ensure Gemini API keys remain 100% secure on the server
 * and are NEVER bundled into client-side JavaScript assets.
 */

/**
 * Auto-generates a concise 1-2 sentence English summary for an article.
 */
export async function generateArticleSummary(title: string, content: string): Promise<string> {
  try {
    const res = await fetch('/api/ai/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    const data = await res.json();
    return data.summary || content.slice(0, 150) + '...';
  } catch (error) {
    console.warn('Gemini API summary fallback:', error);
    return content.slice(0, 150) + '...';
  }
}

/**
 * Suggests relevant hashtags for an article.
 */
export async function generateArticleTags(title: string, content: string): Promise<string[]> {
  try {
    const res = await fetch('/api/ai/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    const data = await res.json();
    return Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : ['News', 'Latest'];
  } catch {
    return ['News', 'Latest'];
  }
}

/**
 * Proofreads & enhances article formatting (Markdown).
 */
export async function proofreadArticle(title: string, content: string): Promise<{ title: string; content: string }> {
  try {
    const res = await fetch('/api/ai/proofread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    const data = await res.json();
    return {
      title: data.title || title,
      content: data.content || content
    };
  } catch (e) {
    console.warn('Proofread fallback:', e);
    return { title, content };
  }
}

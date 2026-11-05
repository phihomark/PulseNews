import { GoogleGenAI } from '@google/genai';

const getApiKey = () => {
  try {
    return (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY || '';
  } catch {
    return '';
  }
};

let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  if (!aiClient) {
    const key = getApiKey();
    if (key) {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiClient;
}

/**
 * Auto-generates a concise 1-2 sentence English summary for an article.
 */
export async function generateArticleSummary(title: string, content: string): Promise<string> {
  const ai = getAIClient();
  if (!ai) {
    return content.slice(0, 150) + '...';
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a senior news editor. Write a concise 1-2 sentence summary (around 25-30 words) in clear English for the following article:\nTitle: ${title}\nContent: ${content.slice(0, 1000)}`
    });

    return response.text?.trim() || content.slice(0, 150) + '...';
  } catch (error) {
    console.warn('Gemini API summary fallback:', error);
    return content.slice(0, 150) + '...';
  }
}

/**
 * Suggests relevant hashtags for an article.
 */
export async function generateArticleTags(title: string, content: string): Promise<string[]> {
  const ai = getAIClient();
  if (!ai) {
    return ['News', 'Latest'];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 4 concise English hashtags (e.g. AI, Tech, Security) suitable for this article. Return ONLY a comma-separated list:\nTitle: ${title}\nContent: ${content.slice(0, 500)}`
    });

    const raw = response.text || '';
    return raw
      .split(',')
      .map(t => t.replace(/#/g, '').trim())
      .filter(t => t.length > 0)
      .slice(0, 5);
  } catch {
    return ['News', 'Latest'];
  }
}

/**
 * Proofreads & enhances article formatting (Markdown).
 */
export async function proofreadArticle(title: string, content: string): Promise<{ title: string; content: string }> {
  const ai = getAIClient();
  if (!ai) return { title, content };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Proofread for spelling, polish journalistic tone in English, and add Markdown subheadings to the following article.\nReturn a JSON object with keys "title" and "content".\nTitle: ${title}\nContent: ${content}`
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || title,
        content: parsed.content || content
      };
    }
  } catch (e) {
    console.warn('Proofread fallback:', e);
  }

  return { title, content };
}

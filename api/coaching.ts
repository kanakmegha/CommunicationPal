import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.VITE_GLM_API_KEY;

// Store conversations (resets on each cold start - use database for production)
const conversations = new Map<string, any[]>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, sessionId } = req.body;
    const historyKey = sessionId || 'default';

    if (!conversations.has(historyKey)) {
      conversations.set(historyKey, [{
        role: 'system',
        content: 'You are Coach, a friendly speech coach. Keep responses SHORT (2-3 sentences).'
      }]);
    }

    const history = conversations.get(historyKey)!;
    history.push({ role: 'user', content: message });
    while (history.length > 20) history.shift();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:5173',
        'X-Title': 'Speech Coaching Arena'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: history,
        max_tokens: 200
      })
    });

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (aiResponse) history.push({ role: 'assistant', content: aiResponse });

    return res.json({ success: true, response: aiResponse });
  } catch (error: any) {
    return res.json({ 
      success: false, 
      error: error.message, 
      fallback: "Tell me more about that!" 
    });
  }
}
import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ===== DEBUG LOGGING =====
  console.log('=== DEBUG START ===');
  console.log('1. API Key exists:', !!process.env.VITE_GLM_API_KEY);
  console.log('2. API Key length:', process.env.VITE_GLM_API_KEY?.length);
  console.log('3. API Key first 10 chars:', process.env.VITE_GLM_API_KEY?.substring(0, 10));
  console.log('4. Request method:', req.method);
  console.log('5. Request body:', JSON.stringify(req.body));
  console.log('=== DEBUG END ===');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Check if API key exists
  if (!process.env.VITE_GLM_API_KEY) {
    console.log('ERROR: API Key is missing!');
    return res.json({ 
      success: false, 
      error: 'API_KEY_MISSING',
      debug: 'VITE_GLM_API_KEY not found in environment',
      fallback: "Tell me more about that!"
    });
  }

  try {
    const { message, sessionId } = req.body;
    console.log('Calling OpenRouter with message:', message);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_GLM_API_KEY}`,
        'HTTP-Referer': 'https://communicationpal.vercel.app',
        'X-Title': 'Speech Coaching Arena'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: 'You are Coach, a friendly speech coach. Keep responses SHORT.' },
          { role: 'user', content: message }
        ],
        max_tokens: 200
      })
    });

    console.log('OpenRouter response status:', response.status);
    
    const responseText = await response.text();
    console.log('OpenRouter response:', responseText);

    if (!response.ok) {
      console.log('OpenRouter error:', responseText);
      return res.json({ 
        success: false, 
        error: 'API_ERROR',
        debug: responseText,
        fallback: "Tell me more about that!"
      });
    }

    const data = JSON.parse(responseText);
    const aiResponse = data.choices?.[0]?.message?.content;
    console.log('AI Response:', aiResponse);

    return res.json({ success: true, response: aiResponse });

  } catch (error: any) {
    console.log('Catch error:', error.message);
    return res.json({ 
      success: false, 
      error: 'CATCH_ERROR',
      debug: error.message,
      fallback: "Tell me more about that!"
    });
  }
}
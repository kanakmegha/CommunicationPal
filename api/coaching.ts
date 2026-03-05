import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Inline Supabase Client for Production Stability
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.VITE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are Coach, a friendly conversation partner who gives speech tips.

CRITICAL RULES:
1. You are having a NORMAL CONVERSATION - remember what was discussed!
2. NEVER use markdown, asterisks, or formatting - just plain text
3. Be genuinely interested and curious about their topic
4. Keep responses to 2-3 sentences MAX
5. Ask ONE natural follow-up question about their topic
6. If there's a speech note, add it briefly in parentheses at the end
7. REMEMBER THE CONTEXT - if they mentioned magic tricks before, remember that!

EXAMPLES:

User: "I want to learn magic tricks"
You: "That's so cool! Magic tricks are such a fun skill. What kind of tricks are you most interested in learning? (You're doing great - keep going!)"

User: "I want to learn card shuffling"
You: "Card shuffling is a great foundation for magic! Are you learning it for magic tricks or just for fun? (Try to finish your sentences completely!)"
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("[Coaching API] Request Received");

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Coaching API] CRITICAL ERROR: Supabase environment variables are missing!");
    return res.status(500).json({ error: "Server configuration error: Missing Supabase credentials." });
  }

  const glmApiKey = process.env.VITE_GLM_API_KEY || process.env.GLM_API_KEY;
  if (!glmApiKey) {
    console.error("[Coaching API] CRITICAL ERROR: GLM API Key (VITE_GLM_API_KEY) is missing!");
    return res.status(500).json({ error: "Server configuration error: Missing LLM API key." });
  }

  try {
    const { message, sessionId, fillerWords, articulationFeedback } = req.body;
    
    // Get conversation history from Supabase
    const sessionKey = sessionId || 'default';
    const { data: convData, error: fetchError } = await supabase
      .from('conversations')
      .select('history')
      .eq('session_id', sessionKey)
      .single();

    let history: any[] = convData?.history || [{ role: 'system', content: SYSTEM_PROMPT }];

    // Build user message with speech notes
    let userMessage = message;
    if (fillerWords?.length > 0) {
      userMessage += `\n\n[Speech note: Used filler words: ${fillerWords.map((f: any) => `"${f.word}" (${f.count}x)`).join(', ')}]`;
    }
    if (articulationFeedback) {
      userMessage += `\n\n[Speech note: ${articulationFeedback}]`;
    }

    // Add user message to history
    history.push({ role: 'user', content: userMessage });

    // Keep history manageable (last 20 messages)
    while (history.length > 20) {
      history.shift();
    }

    // Call OpenRouter
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${glmApiKey}`,
        'HTTP-Referer': 'https://speechpal.vercel.app',
        'X-Title': 'Speech Coaching Arena'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: history,
        max_tokens: 150,
        temperature: 0.8
      })
    });

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    // Add AI response to history
    if (aiResponse) {
      history.push({ role: 'assistant', content: aiResponse });
      
      // Save updated history back to Supabase
      const { error: saveError } = await supabase
        .from('conversations')
        .upsert({ session_id: sessionKey, history: history, updated_at: new Date().toISOString() }, { onConflict: 'session_id' });
        
      if (saveError) console.error('[Coaching] Save Error:', saveError.message);
    }

    return res.json({ success: true, response: aiResponse });

  } catch (error: any) {
    console.error('[Coaching] Error:', error.message);
    return res.json({
      success: false,
      fallback: "That's interesting! Tell me more about that."
    });
  }
}
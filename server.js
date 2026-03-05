import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// OpenRouter API Configuration
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.VITE_GLM_API_KEY;

// Coaching Endpoint
app.post('/api/coaching', async (req, res) => {
  try {
    const { message, fillerWords, sessionId, articulationFeedback } = req.body;
    console.log('[Server] Request from session:', sessionId);

    const sessionKey = sessionId || 'default';
    
    // Get history from Supabase
    const { data: convData } = await supabase
      .from('conversations')
      .select('history')
      .eq('session_id', sessionKey)
      .single();

    let history = convData?.history || [{
      role: 'system',
      content: `You are Coach, a warm and friendly speech coaching assistant having a real conversation.
      
PERSONALITY:
- You're like a supportive friend having a real conversation
- You're genuinely interested in what the user has to say
- You speak naturally, not like a robot

RESPONSE RULES:
- ALWAYS respond to what they just said FIRST - be interested and conversational
- If there's a speech note (filler words, articulation), mention it BRIEFLY after your response
- Keep responses SHORT (2-3 sentences max)
- Ask ONE meaningful follow-up question about their topic
- Never give generic responses like "That's interesting"

EXAMPLES:
User: "I've been thinking about how mental health is very important"
Coach: "Mental health is such an important topic, especially these days. What made you start thinking about it? (Quick tip: try to finish your sentences with confidence!)"

IMPORTANT: Always continue the conversation naturally. The user should feel like they're talking to a friend who happens to give speech tips.`
    }];

    let userMessage = message;
    if (fillerWords && fillerWords.length > 0) {
      userMessage += `\n\n[Speech note: User used filler words: ${fillerWords.map(f => `"${f.word}" (${f.count}x)`).join(', ')}]`;
    }
    if (articulationFeedback) {
      userMessage += `\n\n[Speech note: ${articulationFeedback}]`;
    }

    history.push({ role: 'user', content: userMessage });
    while (history.length > 20) history.shift();

    console.log('[Server] Calling OpenRouter API...');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Speech Coaching Arena'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: history,
        temperature: 0.7,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Server] API Error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    console.log('[Server] AI Response received');

    if (aiResponse) {
      history.push({ role: 'assistant', content: aiResponse });
      // Save to Supabase
      await supabase
        .from('conversations')
        .upsert({ session_id: sessionKey, history: history, updated_at: new Date().toISOString() }, { onConflict: 'session_id' });
    }

    res.json({ success: true, response: aiResponse });

  } catch (error) {
    console.error('[Server] Error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Sessions Endpoints

// Save a session
app.post('/api/sessions', async (req, res) => {
  try {
    const session = {
      ...req.body,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('sessions')
      .insert([session])
      .select()
      .single();

    if (error) throw error;
    
    console.log('[Server] Session saved to Supabase:', data.id);
    res.json({ success: true, session: data });
  } catch (error) {
    console.error('[Server] Save error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single session
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (error) throw error;
    res.json(data || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running with Supabase integration'
  });
});

// General Fallback Responses
function getSmartFallback(message, fillerWords) {
  const fallbacks = [
    "That's interesting! Tell me more about that.",
    "I'd love to hear more about your thoughts on this.",
    "What made you think about this topic?",
    "That's a great point! Can you elaborate?",
    "I'm curious to learn more. What else?",
    "Thanks for sharing! What else is on your mind?"
  ];
  
  let response = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  
  if (fillerWords && fillerWords.length > 0) {
    response += ` Quick tip: try pausing instead of saying "${fillerWords[0].word}".`;
  }
  
  return response;
}

// Start Server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Speech Coaching Server: http://localhost:${PORT}`);
  console.log(`📝 Coaching API: http://localhost:${PORT}/api/coaching`);
  console.log(`📊 Sessions API: http://localhost:${PORT}/api/sessions`);
  console.log(`🔑 API Key: ${API_KEY ? API_KEY.substring(0, 12) + '...' : 'NOT SET!'}\n`);
});
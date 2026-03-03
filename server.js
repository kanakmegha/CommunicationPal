import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// OpenRouter API Configuration
// ============================================
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.VITE_GLM_API_KEY;

// In-memory storage
const conversationHistory = new Map();
const sessionsDB = [];

// ============================================
// Coaching Endpoint
// ============================================
app.post('/api/coaching', async (req, res) => {
  try {
    const { message, fillerWords, sessionId, articulationFeedback } = req.body;
    console.log('[Server] Request:', message);

    const historyKey = sessionId || 'default';
    
    if (!conversationHistory.has(historyKey)) {
      conversationHistory.set(historyKey, [{
        role: 'system',
        content: `You are Coach, a warm and friendly speech coaching assistant.

PERSONALITY:
- You're like a supportive friend having a real conversation
- You speak naturally, not like a robot

RESPONSE RULES:
- Keep responses SHORT (2-3 sentences max)
- ALWAYS respond to what they just said
- Ask ONE meaningful follow-up question

FILLER WORDS:
- If they used filler words, briefly mention it and move on`
      }]);
    }

    const history = conversationHistory.get(historyKey);

    let userMessage = message;
    if (fillerWords && fillerWords.length > 0) {
      userMessage += `\n\n[Coach note: Filler words used: ${fillerWords.map(f => `"${f.word}"`).join(', ')}]`;
    }
    if (articulationFeedback) {
      userMessage += `\n\n[Articulation note: ${articulationFeedback}]`;
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
        model: 'meta-llama/llama-3.1-8b-instruct:free',
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
    console.log('[Server] AI Response:', aiResponse);

    if (aiResponse) {
      history.push({ role: 'assistant', content: aiResponse });
    }

    res.json({ success: true, response: aiResponse });

  } catch (error) {
    console.error('[Server] Error:', error.message);
    const fallback = getSmartFallback(req.body?.message, req.body?.fillerWords);
    res.json({ success: false, error: error.message, fallback });
  }
});

// ============================================
// Sessions Endpoints
// ============================================

// Save a session
app.post('/api/sessions', (req, res) => {
  try {
    const session = {
      id: Date.now(),
      ...req.body,
      created_at: new Date().toISOString()
    };
    sessionsDB.unshift(session);
    console.log('[Server] ✅ Session saved:', session.id, 'Score:', session.overall_score);
    console.log('[Server] Total sessions:', sessionsDB.length);
    res.json({ success: true, session });
  } catch (error: any) {
    console.error('[Server] Save error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  console.log('[Server] Fetching sessions, count:', sessionsDB.length);
  res.json(sessionsDB);
});

// Get single session
app.get('/api/sessions/:id', (req, res) => {
  const session = sessionsDB.find(s => s.id === parseInt(req.params.id));
  res.json(session || null);
});

// ============================================
// Health Check
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    sessionsCount: sessionsDB.length 
  });
});

// ============================================
// Fallback Responses
// ============================================
function getSmartFallback(message: string, fillerWords: { word: string; count: number }[]) {
  const lowerMsg = (message || '').toLowerCase();
  
  if (lowerMsg.includes('layoff') || lowerMsg.includes('fired')) {
    return "I'm sorry about the layoffs - that's been tough for many. How is this affecting you?";
  }
  if (lowerMsg.includes('ai') && lowerMsg.includes('job')) {
    return "AI's impact on jobs is a real concern. What kind of work do you do?";
  }
  if (lowerMsg.includes('stress')) {
    return "It sounds stressful. What's been the hardest part?";
  }
  if (lowerMsg.includes('hobby')) {
    return "Finding a new hobby is exciting! What activities interest you?";
  }
  if (fillerWords && fillerWords.length > 0) {
    return `Good point! Try pausing instead of saying "${fillerWords[0].word}". Tell me more!`;
  }
  
  const responses = [
    "Tell me more about that!",
    "What made you think about this?",
    "I'm curious - what's your take on it?",
    "That's interesting! What else?"
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// ============================================
// Start Server
// ============================================
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Speech Coaching Server: http://localhost:${PORT}`);
  console.log(`📝 Coaching API: http://localhost:${PORT}/api/coaching`);
  console.log(`📊 Sessions API: http://localhost:${PORT}/api/sessions`);
  console.log(`🔑 API Key: ${API_KEY ? API_KEY.substring(0, 12) + '...' : 'NOT SET!'}\n`);
});
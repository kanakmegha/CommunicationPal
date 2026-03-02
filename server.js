// server.js - ES Module version
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// GLM API Configuration
const GLM_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GLM_API_KEY = process.env.VITE_GLM_API_KEY;

// Store conversation history per session
const conversationHistory = new Map();

app.post('/api/coaching', async (req, res) => {
  try {
    const { message, fillerWords, sessionId, articulationFeedback } = req.body;
    console.log('[Server] Request:', { message, fillerWords });

    const historyKey = sessionId || 'default';
    
    // Initialize conversation history
    if (!conversationHistory.has(historyKey)) {
      conversationHistory.set(historyKey, [
        {
          role: 'system',
          content: `You are Coach, a warm and friendly speech coaching assistant.

PERSONALITY:
- You're like a supportive friend having a real conversation
- You remember what was discussed and reference it naturally
- You're genuinely interested in the user's thoughts
- You speak naturally, not like a robot

RESPONSE RULES:
- Keep responses SHORT (2-3 sentences max)
- ALWAYS respond to the specific thing they just said
- If they mention layoffs, AI, jobs, economy - talk about THAT specifically
- Ask ONE meaningful follow-up question
- Never give generic responses like "That's interesting"
- Sound like a human, not a chatbot

FILLER WORDS:
- If they used filler words, briefly mention it then move on
- Give a quick tip like "try pausing instead"

ARTICULATION:
- If they had articulation issues, encourage them to finish their thoughts

Example good responses:
- "Layoffs in tech have been stressful for many. How are you feeling about job security in your field?"
- "You're right that AI is changing how we work. What skills do you think will matter most?"
- "That's a valid concern about AI replacing jobs. Have you thought about how to adapt your skills?"`
        }
      ]);
    }

    const history = conversationHistory.get(historyKey);

    // Build user message with context
    let userMessage = message;
    if (fillerWords && fillerWords.length > 0) {
      userMessage += `\n\n[Coach note: I used these filler words: ${fillerWords.map(f => `"${f.word}"`).join(', ')}]`;
    }
    if (articulationFeedback) {
      userMessage += `\n\n[Articulation note: ${articulationFeedback}]`;
    }

    history.push({ role: 'user', content: userMessage });
    
    // Keep history manageable
    while (history.length > 20) {
      history.shift();
    }

    console.log('[Server] Calling GLM API...');
    
    // Call GLM API
    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',  // or 'glm-4' or 'glm-4-air' for cheaper option
        messages: history,
        temperature: 0.7,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Server] GLM API Error:', errorText);
      throw new Error(`GLM API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    console.log('[Server] GLM response:', aiResponse);

    if (aiResponse) {
      history.push({ role: 'assistant', content: aiResponse });
    }

    res.json({ 
      success: true, 
      response: aiResponse 
    });

  } catch (error) {
    console.error('[Server] Error:', error.message);
    
    // Return smart fallback
    const fallback = getSmartFallback(req.body?.message, req.body?.fillerWords);
    res.json({ 
      success: false, 
      error: error.message,
      fallback 
    });
  }
});

// Smart fallback function
function getSmartFallback(message, fillerWords) {
  const lowerMsg = (message || '').toLowerCase();
  
  // Topic-specific responses
  if (lowerMsg.includes('layoff') || lowerMsg.includes('layoffs') || lowerMsg.includes('fired')) {
    return "I'm sorry about the layoffs happening - that's been really tough for many people. How is this affecting you or people you know?";
  }
  if (lowerMsg.includes('ai') && (lowerMsg.includes('replace') || lowerMsg.includes('job'))) {
    return "The concern about AI replacing jobs is real. What kind of work do you do, and how do you see AI affecting it?";
  }
  if (lowerMsg.includes('stressful') || lowerMsg.includes('stress')) {
    return "It sounds like you're dealing with a lot of stress. What's been the hardest part for you?";
  }
  if (lowerMsg.includes('ai impacting') || lowerMsg.includes('ai affecting') || lowerMsg.includes('how ai')) {
    return "AI's impact is definitely huge right now. How have you seen it change things in your own life or work?";
  }
  if (lowerMsg.includes('future') || lowerMsg.includes('10 years')) {
    return "Thinking about the future is both exciting and uncertain. What changes are you most curious or concerned about?";
  }
  if (lowerMsg.includes('human') && lowerMsg.includes('conversation')) {
    return "I appreciate you wanting a natural conversation! Let's keep chatting - what else is on your mind?";
  }
  if (lowerMsg.includes('thinking about')) {
    return "That's something many people are reflecting on. What made you start thinking about this?";
  }
  if (fillerWords && fillerWords.length > 0) {
    return `Good point! Quick tip: try pausing instead of saying "${fillerWords[0].word}" - it sounds more confident. What else would you like to discuss?`;
  }
  
  // Generic engaging responses
  const genericResponses = [
    "Tell me more about that - I'm curious about your perspective.",
    "That's an important topic. What made you start thinking about this?",
    "I'd love to hear more of your thoughts. What's your take on it?",
    "What specifically interests you most about that?"
  ];
  
  let response = genericResponses[Math.floor(Math.random() * genericResponses.length)];
  
  if (fillerWords && fillerWords.length > 0) {
    response += ` Also, try pausing instead of saying "${fillerWords[0].word}"!`;
  }

  return response;
}
// In-memory session storage (use a database in production)
const sessionsDB = [];

// Save a session
app.post('/api/sessions', (req, res) => {
  try {
    const session = {
      id: Date.now(),
      ...req.body,
      created_at: new Date().toISOString()
    };
    sessionsDB.unshift(session); // Add to beginning
    console.log('[Server] Saved session:', session.id);
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  res.json(sessionsDB);
});

// Get single session
app.get('/api/sessions/:id', (req, res) => {
  const session = sessionsDB.find(s => s.id === parseInt(req.params.id));
  res.json(session || null);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Speech Coaching Server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoint: http://localhost:${PORT}/api/coaching`);
  console.log(`🔑 Using GLM API Key: ${GLM_API_KEY ? GLM_API_KEY.substring(0, 10) + '...' : 'NOT SET!'}\n`);
});

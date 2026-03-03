import type { VercelRequest, VercelResponse } from '@vercel/node';

// api/coaching.ts
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, sessionId, fillerWords, articulationFeedback } = req.body;

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
          { 
            role: 'system', 
            content: `You are Coach, a friendly conversation partner who happens to give speech tips.

CRITICAL RULES:
1. You are having a NORMAL CONVERSATION first - respond to what they said like a friend would
2. NEVER use markdown, asterisks, bullet points, or formatting - just plain text
3. Be genuinely interested and curious about their topic
4. Keep responses to 2-3 sentences MAX
5. Ask ONE natural follow-up question about their topic
6. If there's a speech note (filler words, articulation issues), add it naturally at the end in parentheses - keep it brief!

EXAMPLES:

User: "I've been thinking about how AI is affecting our life"
You: "That's such a relevant topic these days. What aspects of AI's impact concern you most? (Quick tip - try finishing your sentences with confidence!)"

User: "I'm worried about AI replacing jobs"
You: "That's a valid concern a lot of people share. What field do you work in? (Also, you're doing great - just watch those filler words!)"

User: "AI replacing people in the job market"
You: "The job market is definitely changing with AI. What kind of work are you in? (Try to finish your thoughts more completely!)"

NEVER:
- Use bullet points
- Use asterisks or bold text
- Ask about "pronunciation" 
- Give generic responses like "That's interesting"
- Sound like a robot or textbook`
          },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.8
      })
    });

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    return res.json({ success: true, response: aiResponse });

  } catch (error: any) {
    return res.json({ 
      success: false, 
      fallback: "That's interesting! Tell me more about that."
    });
  }
}
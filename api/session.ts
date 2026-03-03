import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage (will reset on each cold start)
// For persistence, use Vercel KV, Postgres, or external database
const sessionsDB: any[] = [];

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Fetch all sessions
  if (req.method === 'GET') {
    return res.json(sessionsDB);
  }

  // POST - Save session
  if (req.method === 'POST') {
    const session = {
      id: Date.now(),
      ...req.body,
      created_at: new Date().toISOString()
    };
    sessionsDB.unshift(session);
    console.log('Saved session:', session.id);
    return res.json({ success: true, session });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
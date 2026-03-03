// api/sessions.ts
const sessionsDB: any[] = [];

export default async function handler(req: any, res: any) {
  // ===== DEBUG LOGGING =====
  console.log('========================================');
  console.log('[Sessions API] START');
  console.log('[Sessions API] Method:', req.method);
  console.log('[Sessions API] URL:', req.url);
  console.log('[Sessions API] Headers:', JSON.stringify(req.headers));
  console.log('[Sessions API] Body:', JSON.stringify(req.body));
  console.log('[Sessions API] Current sessions count:', sessionsDB.length);
  console.log('========================================');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    console.log('[Sessions API] Handling OPTIONS preflight');
    return res.status(200).end();
  }

  // GET - Fetch all sessions
  if (req.method === 'GET') {
    console.log('[Sessions API] GET request - returning', sessionsDB.length, 'sessions');
    console.log('[Sessions API] Sessions data:', JSON.stringify(sessionsDB));
    return res.json(sessionsDB);
  }

  // POST - Save session
  if (req.method === 'POST') {
    console.log('[Sessions API] POST request - saving session');
    
    try {
      const session = {
        id: Date.now(),
        ...req.body,
        created_at: new Date().toISOString()
      };
      
      console.log('[Sessions API] Session to save:', JSON.stringify(session));
      
      sessionsDB.unshift(session);
      
      console.log('[Sessions API] ✅ Session saved successfully');
      console.log('[Sessions API] Total sessions now:', sessionsDB.length);
      
      return res.json({ 
        success: true, 
        session,
        debug: {
          totalSessions: sessionsDB.length,
          savedAt: session.created_at
        }
      });
    } catch (error: any) {
      console.log('[Sessions API] ❌ Error saving:', error.message);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Unknown method
  console.log('[Sessions API] ❌ Unknown method:', req.method);
  return res.status(405).json({ 
    error: 'Method not allowed',
    allowedMethods: ['GET', 'POST', 'OPTIONS']
  });
}
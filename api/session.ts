import { kv } from "@vercel/kv";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("========================================");
  console.log("[Sessions API] START");
  console.log("[Sessions API] Method:", req.method);
  console.log("[Sessions API] URL:", req.url);
  console.log("========================================");

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // =========================
    // GET - Fetch sessions
    // =========================
    if (req.method === "GET") {
      const sessions = await kv.lrange("sessions", 0, 50);

      console.log("[Sessions API] Returning sessions:", sessions.length);

      return res.json(sessions);
    }

    // =========================
    // POST - Save session
    // =========================
    if (req.method === "POST") {
      const session = {
        id: Date.now(),
        ...req.body,
        created_at: new Date().toISOString(),
      };

      console.log("[Sessions API] Saving session:", session.id);

      // push to KV list
      await kv.lpush("sessions", session);

      const totalSessions = await kv.llen("sessions");

      console.log("[Sessions API] Session saved. Total:", totalSessions);

      return res.json({
        success: true,
        session,
        debug: {
          totalSessions,
          savedAt: session.created_at,
        },
      });
    }

    return res.status(405).json({
      error: "Method not allowed",
      allowedMethods: ["GET", "POST", "OPTIONS"],
    });

  } catch (error: any) {
    console.error("[Sessions API] ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
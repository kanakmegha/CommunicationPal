import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceRole);

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log("[Sessions API] Returning sessions:", data.length);
      return res.json(data);
    }

    // =========================
    // POST - Save session
    // =========================
    if (req.method === "POST") {
      const session = {
        ...req.body,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("sessions")
        .insert([session])
        .select()
        .single();

      if (error) throw error;

      console.log("[Sessions API] Session saved:", data.id);

      return res.json({
        success: true,
        session: data,
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
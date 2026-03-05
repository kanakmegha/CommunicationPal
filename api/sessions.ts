import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {

    // GET sessions
    if (req.method === "GET") {

      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.json(data);
    }

    // POST session
    if (req.method === "POST") {

      const session = {
        overall_score: req.body.overall_score,
        duration_seconds: req.body.duration_seconds,
        parameter_scores: req.body.parameter_scores,
        learning_curve: req.body.learning_curve,
        feedback: req.body.feedback,
        focus_parameters: req.body.focus_parameters
      };

      const { data, error } = await supabase
        .from("sessions")
        .insert([session])
        .select();

      if (error) throw error;

      return res.json({ success: true, session: data });

    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err: any) {

    console.error("[Sessions API Error]", err.message);

    return res.status(500).json({
      success: false,
      error: err.message
    });

  }
}
import { Hono } from "hono";
import { streamCoachResponse } from "./streaming";

const app = new Hono<{ Bindings: Env }>();

// Stream chat response (NDJSON)
app.post("/api/chat/stream", async (c) => {
  const { message, focus_parameters } = await c.req.json();
  const apiKey = c.env.GEMINI_API_KEY || c.env.GOOGLE_GENERATIVE_AI_API_KEY;

  return c.streamText(async (stream) => {
    const generator = streamCoachResponse(message, focus_parameters || [], apiKey);
    for await (const chunk of generator) {
      await stream.writeln(JSON.stringify(chunk));
    }
  });
});

// Portable Engine Analysis Endpoint
app.post("/api/analyze-live", async (c) => {
  const { text, previousScores, focus_parameters } = await c.req.json();
  const apiKey = c.env.GEMINI_API_KEY || c.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  const analysis = await import("./streaming").then(m => 
    m.analyzeLiveCoaching(text, focus_parameters || ["articulation", "expression"], previousScores || { articulation: 85, expression: 85 }, apiKey)
  );

  return c.json(analysis);
});

// Save a session
app.post("/api/sessions", async (c) => {
  const body = await c.req.json();
  const { overall_score, duration_seconds, parameter_scores, learning_curve, feedback, focus_parameters } = body;

  const result = await c.env.DB.prepare(`
    INSERT INTO sessions (overall_score, duration_seconds, parameter_scores, learning_curve, feedback, focus_parameters)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    overall_score,
    duration_seconds,
    JSON.stringify(parameter_scores),
    JSON.stringify(learning_curve),
    JSON.stringify(feedback),
    JSON.stringify(focus_parameters)
  ).run();

  return c.json({ success: true, id: result.meta.last_row_id });
});

// Get all sessions
app.get("/api/sessions", async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT * FROM sessions ORDER BY created_at DESC
  `).all();

  const sessions = result.results.map((row: Record<string, unknown>) => ({
    ...row,
    parameter_scores: JSON.parse(row.parameter_scores as string),
    learning_curve: JSON.parse(row.learning_curve as string),
    feedback: JSON.parse(row.feedback as string),
    focus_parameters: JSON.parse(row.focus_parameters as string),
  }));

  return c.json(sessions);
});

// Get a single session
app.get("/api/sessions/:id", async (c) => {
  const id = c.req.param("id");
  const result = await c.env.DB.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `).bind(id).first();

  if (!result) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({
    ...result,
    parameter_scores: JSON.parse(result.parameter_scores as string),
    learning_curve: JSON.parse(result.learning_curve as string),
    feedback: JSON.parse(result.feedback as string),
    focus_parameters: JSON.parse(result.focus_parameters as string),
  });
});

export default app;

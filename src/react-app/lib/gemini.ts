import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const MIMO_API_KEY = import.meta.env.VITE_MIMO_API_KEY as string;

if (!API_KEY && !MIMO_API_KEY) {
  console.warn("Neither VITE_GEMINI_API_KEY nor VITE_MIMO_API_KEY is set. AI features will be disabled.");
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Unified Session type
interface CustomChatSession {
  type: "gemini" | "mimo";
  session: any; // Direct Gemini session or history array for Mimo
  systemInstruction: string;
}

// ─── Arena Coach ────────────────────────────────────────────────────────────

/**
 * Start a stateful coaching chat session.
 * Supports direct Google AI or OpenRouter (Mimo).
 */
export function createCoachSession(focusParameters: string[]): CustomChatSession | null {
  if (!genAI && !MIMO_API_KEY) return null;

  const paramList = focusParameters
    .map((p) => p.replace("_", " "))
    .join(", ");

  const systemInstruction = `You are ComPal, a world-class, empathetic, and highly engaging speech and communication coach. 
The user is currently in a live practice session focusing on: ${paramList || "general communication skills"}.

Your goal is to be a supportive partner who makes the user feel exceptionally comfortable and safe to express themselves. 
- Use a natural, conversational, and human-like tone. 
- Avoid sounding like a robot or a generic assistant. 
- Be warm and encouraging, using phrases like "That's a great point," or "I love how you phrased that."
- **CRITICAL**: Especially at the start of a session, ask gentle, low-stakes, and open-ended questions to build the user's confidence (e.g., about their day, a favorite hobby, or a topic they know well).
- Always end your response with a thought-provoking but non-intimidating question that encourages the user to elaborate.
- Keep your responses concise (2-3 sentences max) to maintain the flow of a live session.
- If you notice the user is struggling with ${paramList}, offer a quick, friendly tip mid-conversation.
- Instead of just saying "I'm ready," start with a warm welcome and a specific, engaging prompt to get them talking immediately about something comfortable.`;

  if (MIMO_API_KEY) {
    return {
      type: "mimo",
      session: [], // History for OpenRouter
      systemInstruction,
    };
  }

  const model = genAI!.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction,
  });

  return {
    type: "gemini",
    session: model.startChat({ history: [] }),
    systemInstruction,
  };
}

/**
 * Send a user message to the coach and get a response.
 */
export async function sendCoachMessage(
  chat: CustomChatSession | null,
  userMessage: string
): Promise<string> {
  if (!chat) return "AI coach is unavailable. Please check your API keys.";

  if (chat.type === "mimo") {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MIMO_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "ComPal",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-maverick",
          messages: [
            { role: "system", content: chat.systemInstruction },
            ...chat.session,
            { role: "user", content: userMessage },
          ],
        }),
      });

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;

      // Update history
      chat.session.push({ role: "user", content: userMessage });
      chat.session.push({ role: "assistant", content: aiMessage });

      return aiMessage;
    } catch (err) {
      console.error("Mimo coach error:", err);
      return "Sorry, I couldn't process that via Mimo. Please try again.";
    }
  }

  try {
    const result = await chat.session.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    console.error("Gemini coach error:", err);
    return "Sorry, I couldn't process that. Please try again.";
  }
}

// ─── Debrief Feedback ───────────────────────────────────────────────────────

export interface ScoreSummary {
  param: string;
  label: string;
  score: number;
}

/**
 * Generate personalised post-session feedback.
 */
export async function generateGeminiFeedback(
  scores: ScoreSummary[]
): Promise<string[]> {
  const scoreText = scores
    .map(({ label, score }) => `${label}: ${score}/10`)
    .join(", ");

  const prompt = `You are a professional speech coach giving post-session feedback.
The user just completed a communication practice session with these scores: ${scoreText}.
Write exactly 3 specific, encouraging, and actionable feedback points (one per score if possible, otherwise combine).
Each point should be 1-2 sentences. Be concrete and motivating.
Return ONLY the 3 feedback points as a JSON array of strings.
Example: ["Great job on X. Try Y next time.", "Your Z was strong...", "Focus on W..."]`;

  if (MIMO_API_KEY) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MIMO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-maverick",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });

      const data = await response.json();
      const text = data.choices[0].message.content.trim();
      const parsed = JSON.parse(text);
      
      // Handle the case where the JSON might be wrapped in an object
      const points = Array.isArray(parsed) ? parsed : (parsed.feedback || parsed.points || []);
      if (Array.isArray(points)) return points.slice(0, 3);
    } catch (err) {
      console.error("Mimo feedback error:", err);
    }
  }

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 3) as string[];
      }
    } catch (err) {
      console.error("Gemini feedback error:", err);
    }
  }

  // Graceful fallback
  return scores.map(
    ({ label, score }) =>
      `Your ${label} score was ${score}/10. Keep practising to improve!`
  );
}


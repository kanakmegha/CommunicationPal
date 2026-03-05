import { createClient } from "@supabase/supabase-js";

// Dedicated Server-side Client for Vercel Functions
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.VITE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("[Supabase Server] Missing Environment Variables!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

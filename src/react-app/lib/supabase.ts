import { createClient } from "@supabase/supabase-js";

// Server-side environment variables (Vercel)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Safety check
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Server client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
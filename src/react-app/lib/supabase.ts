import { createClient } from "@supabase/supabase-js";

/**
 * Environment-aware Supabase Client
 * 
 * Works in:
 * 1. Vite Frontend (using import.meta.env)
 */

// Standard Frontend Supabase Client (Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Frontend Supabase credentials missing. Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
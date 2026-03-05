import { createClient } from "@supabase/supabase-js";

/**
 * Environment-aware Supabase Client
 * 
 * Works in:
 * 1. Vite Frontend (using import.meta.env)
 * 2. Node.js Backend/Vercel (using process.env)
 */

// Handle Frontend (Vite) vs Backend (Node)
const supabaseUrl = 
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : null) || 
  (import.meta.env?.VITE_SUPABASE_URL) || "";

const supabaseAnonKey = 
  (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : null) || 
  (import.meta.env?.VITE_SUPABASE_ANON_KEY) || "";

const supabaseServiceKey = 
  (typeof process !== 'undefined' ? (process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) : null) || 
  (import.meta.env?.VITE_SERVICE_ROLE_KEY) || "";

// Standard client (Anon - respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (Service Role - bypasses RLS) - USE ONLY IN BACKEND
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
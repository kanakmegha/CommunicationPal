import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Browser client (for frontend usage if needed later)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client (for API routes)
// Note: On Vercel, we can use the Service Role Key for full access
export const getSupabaseServer = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    // Fallback to anon key if service role is missing (though not ideal for backend)
    return supabase;
  }
  return createClient(supabaseUrl, serviceRoleKey);
};

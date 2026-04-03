import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Keep the warning, it's helpful for debugging!
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials are missing. Check your .env file.");
}

// Ensure it doesn't break the build if keys are temporarily undefined
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
);

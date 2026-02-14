import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseAnonEnv = Boolean(url && anonKey);
export const hasSupabaseServiceEnv = Boolean(url && serviceRoleKey);

export function getSupabaseServerClient() {
  if (!url || !anonKey) {
    throw new Error("Supabase anon credentials are missing.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false }
  });
}

export function getSupabaseServiceClient() {
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role credentials are missing.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

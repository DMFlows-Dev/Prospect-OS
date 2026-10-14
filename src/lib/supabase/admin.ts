import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-only, used for the few things a
 * signed-in user cannot do for themselves (creating a teammate's login).
 * Callers must verify the acting user's role first.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local and restart the server.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

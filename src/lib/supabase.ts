import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (!_client) {
    const { createClient } = await import("@supabase/supabase-js");
    _client = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    );
  }
  return _client;
}

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !supabaseUrl?.includes("your-project-ref") &&
  !supabaseAnonKey?.includes("your-publishable");

const createFirst100DaysClient = () => {
  const client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  const getSession = client.auth.getSession.bind(client.auth);
  client.auth.getSession = async () => {
    const result = await getSession();
    const expiresAt = result.data.session?.expires_at || 0;
    const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
    if (result.data.session && expiresIn < 90) {
      const refreshed = await client.auth.refreshSession();
      if (refreshed.error) return { data: { session: null }, error: refreshed.error };
      return refreshed.data.session
        ? { data: { session: refreshed.data.session }, error: null }
        : { data: { session: null }, error: null };
    }
    return result;
  };

  return client;
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createFirst100DaysClient()
  : null;

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton — safe during SSR build without env vars
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Return a dummy during build — will never be called in production
    throw new Error('Supabase env vars not set. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
  }
  _supabase = createClient(url, key);
  return _supabase;
}

// Convenience shorthand
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

// Server-side client with service role (only used in API routes)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

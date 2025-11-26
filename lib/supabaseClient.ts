import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

// Only log on server-side to avoid exposing environment info in browser
if (typeof window === 'undefined') {
  console.log('Supabase Service Key:', supabaseServiceKey ? 'Available' : 'Missing')
  console.log('Environment check:', { 
    hasSecret: !!process.env.SUPABASE_SECRET_KEY,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_KEY
  })
}

const globalForSupabase = globalThis as unknown as {
  supabase?: SupabaseClient;
  supabaseAdmin?: SupabaseClient;
};

// Client for frontend operations (with auth)
export const supabase = globalForSupabase.supabase ?? (
  globalForSupabase.supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'bbox-auth',
    }
  })
);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = globalForSupabase.supabaseAdmin ?? (
  globalForSupabase.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
);

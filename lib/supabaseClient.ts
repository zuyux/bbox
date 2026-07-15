import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { fetchWithRetry } from './externalApi';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

function supabaseFetch(input: string | Request | URL, init?: RequestInit) {
  return fetchWithRetry(input, init);
}

// Only log on server-side to avoid exposing environment info in browser
if (typeof window === 'undefined') {
  console.log('Supabase Service Key:', supabaseServiceKey ? 'Available' : 'Missing')
  console.log('Environment check:', { 
    hasSecret: !!supabaseServiceKey,
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
    },
    global: {
      fetch: supabaseFetch,
    },
  })
);

// Admin client for server-side operations (bypasses RLS)
function createSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin may only be instantiated on the server');
  }

  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: supabaseFetch,
    },
  });
}

export const supabaseAdmin = typeof window === 'undefined'
  ? globalForSupabase.supabaseAdmin ?? (
      globalForSupabase.supabaseAdmin = createSupabaseAdminClient()
    )
  : (null as unknown as SupabaseClient);

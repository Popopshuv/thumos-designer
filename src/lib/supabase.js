function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }

  if (!supabaseAnonKey && !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase API key (SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY)');
  }

  // Ensure URL has proper protocol
  let finalSupabaseUrl = supabaseUrl;
  if (!finalSupabaseUrl.startsWith('http://') && !finalSupabaseUrl.startsWith('https://')) {
    finalSupabaseUrl = `https://${finalSupabaseUrl}`;
  }

  return {
    url: finalSupabaseUrl,
    anonKey: supabaseAnonKey,
    serviceRoleKey: supabaseServiceRoleKey,
  };
}

// Server-side Supabase client (uses service role key for admin operations)
// Import from CJS build to avoid webpack ESM issues
export async function getSupabaseClient(useServiceRole = false) {
  // Use dynamic import with explicit path to CJS build
  const supabaseModule = await import('@supabase/supabase-js');
  const { createClient } = supabaseModule;
  
  const config = getSupabaseConfig();
  const key = useServiceRole && config.serviceRoleKey 
    ? config.serviceRoleKey 
    : config.anonKey || config.serviceRoleKey;
  
  return createClient(config.url, key);
}


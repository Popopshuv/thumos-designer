// Import from CommonJS wrapper to avoid ESM issues
import { getSupabaseClient } from "./supabase-server.cjs";

// Re-export for use in API routes
export { getSupabaseClient };

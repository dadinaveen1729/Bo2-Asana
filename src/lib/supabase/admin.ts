import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Service-role client for server-only jobs (cron, webhooks) that need to
// read across every workspace with no authenticated user in the request.
// RLS policies like tasks_select gate on is_workspace_member(auth.uid()),
// which is null outside a request carrying a session cookie -- the anon
// key would just return zero rows here. Never import this from client code.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
